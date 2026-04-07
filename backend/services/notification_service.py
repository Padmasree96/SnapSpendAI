"""
Notification engine for SnapSpend AI.
Generates notifications from actual user budgets, account balances,
recurring bill patterns, spending changes, and monthly activity.
"""

import calendar
import re
from collections import Counter, defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from models.account import Account
from models.budget import Budget
from models.notification import Notification
from models.transaction import Transaction

SUPPORTED_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%m/%d/%Y",
    "%m-%d-%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
)

RECURRING_BILL_CATEGORIES = {"bills", "subscriptions", "rent"}


def _parse_transaction_date(raw_date: Optional[str]) -> Optional[datetime]:
    if raw_date is None:
        return None

    if isinstance(raw_date, datetime):
        return raw_date

    value = str(raw_date).strip()
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        pass

    for date_format in SUPPORTED_DATE_FORMATS:
        try:
            return datetime.strptime(value, date_format)
        except ValueError:
            continue

    return None


def _normalize_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _normalize_category(value: Optional[str]) -> str:
    return _normalize_text(value).lower()


def _normalize_transaction_type(value: Optional[str]) -> str:
    return _normalize_text(value).lower()


def _month_key(value: datetime) -> str:
    return value.strftime("%Y-%m")


def _start_of_month(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _notification_exists(user_id: int, notif_type: str, title: str, db: Session, since: datetime) -> bool:
    existing = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.type == notif_type,
        Notification.title == title,
        Notification.created_at >= since,
    ).first()
    return existing is not None


def _build_preserved_state(user_id: int, db: Session, now: datetime) -> Dict:
    month_start = _start_of_month(now)
    existing_notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.created_at >= month_start,
    ).all()

    preserved_state = {
        (notification.type, notification.title): {
            "read": notification.read,
            "created_at": notification.created_at,
        }
        for notification in existing_notifications
    }

    for notification in existing_notifications:
        db.delete(notification)

    if existing_notifications:
        db.commit()

    return preserved_state


def _restore_notification_state(notification: Notification, preserved_state: Dict) -> None:
    state = preserved_state.get((notification.type, notification.title))
    if not state:
        return

    notification.read = bool(state.get("read", False))
    notification.created_at = state.get("created_at") or notification.created_at


def sync_notifications_for_user(user_id: int, db: Session) -> List[Notification]:
    now = datetime.utcnow()
    preserved_state = _build_preserved_state(user_id, db, now)
    return generate_notifications_for_user(user_id, db, now=now, preserved_state=preserved_state)


def generate_notifications_for_user(
    user_id: int,
    db: Session,
    now: Optional[datetime] = None,
    preserved_state: Optional[Dict] = None,
) -> List[Notification]:
    """Generate notifications using the user's actual stored data."""
    now = now or datetime.utcnow()
    preserved_state = preserved_state or {}
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    accounts = db.query(Account).filter(Account.user_id == user_id).all()

    generated: List[Notification] = []
    generated.extend(_check_budget_alerts(user_id, db, budgets, transactions, now, preserved_state))
    generated.extend(_check_low_balance_alerts(user_id, db, accounts, now, preserved_state))
    generated.extend(_generate_bill_reminders(user_id, db, transactions, now, preserved_state))
    generated.extend(_generate_spending_alerts(user_id, db, transactions, now, preserved_state))
    generated.extend(_generate_monthly_summary(user_id, db, transactions, now, preserved_state))
    return generated


def _check_budget_alerts(
    user_id: int,
    db: Session,
    budgets: List[Budget],
    transactions: List[Transaction],
    now: datetime,
    preserved_state: Dict,
) -> List[Notification]:
    current_month = _month_key(now)
    month_start = _start_of_month(now)
    spent_by_category = defaultdict(float)

    for transaction in transactions:
        transaction_date = _parse_transaction_date(transaction.date)
        if transaction_date is None or _month_key(transaction_date) != current_month:
            continue
        if _normalize_transaction_type(transaction.type) != "expense":
            continue

        spent_by_category[_normalize_category(transaction.category)] += float(transaction.amount or 0)

    alerts: List[Notification] = []
    changed = False

    for budget in budgets:
        if budget.month != current_month:
            continue

        spent = round(spent_by_category.get(_normalize_category(budget.category), 0), 2)
        if round(float(budget.spent or 0), 2) != spent:
            budget.spent = spent
            changed = True

        if budget.limit_amount <= 0:
            continue

        pct = spent / budget.limit_amount * 100
        title = None
        message = None
        severity = None

        if pct >= 100:
            title = f"Budget Exceeded: {budget.category.title()}"
            message = (
                f"You've spent ${spent:,.2f} out of your ${budget.limit_amount:,.2f} "
                f"budget for {budget.category.title()} ({round(pct)}%)."
            )
            severity = "danger"
        elif pct >= 80:
            title = f"Budget Warning: {budget.category.title()}"
            message = (
                f"You've used {round(pct)}% of your {budget.category.title()} budget "
                f"(${spent:,.2f} / ${budget.limit_amount:,.2f})."
            )
            severity = "warning"

        if not title or _notification_exists(user_id, "budget", title, db, month_start):
            continue

        notification = Notification(
            user_id=user_id,
            type="budget",
            title=title,
            message=message,
            severity=severity,
        )
        _restore_notification_state(notification, preserved_state)
        db.add(notification)
        db.flush()
        alerts.append(notification)
        changed = True

    if changed:
        db.commit()
        for alert in alerts:
            db.refresh(alert)

    return alerts


def _check_low_balance_alerts(
    user_id: int,
    db: Session,
    accounts: List[Account],
    now: datetime,
    preserved_state: Dict,
) -> List[Notification]:
    month_start = _start_of_month(now)
    alerts: List[Notification] = []
    changed = False

    for account in accounts:
        title = None
        message = None
        severity = None

        if float(account.balance or 0) < 0:
            title = f"Negative Balance: {account.name}"
            message = (
                f"Your {account.name} balance is ${account.balance:,.2f}. "
                "Please review recent transactions or add funds."
            )
            severity = "danger"
        elif float(account.balance or 0) < 100:
            title = f"Low Balance: {account.name}"
            message = (
                f"Your {account.name} balance is ${account.balance:,.2f}. "
                "Consider adding funds soon."
            )
            severity = "warning"

        if not title or _notification_exists(user_id, "warning", title, db, month_start):
            continue

        notification = Notification(
            user_id=user_id,
            type="warning",
            title=title,
            message=message,
            severity=severity,
        )
        _restore_notification_state(notification, preserved_state)
        db.add(notification)
        db.flush()
        alerts.append(notification)
        changed = True

    if changed:
        db.commit()
        for alert in alerts:
            db.refresh(alert)

    return alerts


def _generate_bill_reminders(
    user_id: int,
    db: Session,
    transactions: List[Transaction],
    now: datetime,
    preserved_state: Dict,
) -> List[Notification]:
    month_start = _start_of_month(now)
    current_month = _month_key(now)
    recurring_groups = defaultdict(list)

    for transaction in transactions:
        transaction_date = _parse_transaction_date(transaction.date)
        if transaction_date is None:
            continue
        if _normalize_transaction_type(transaction.type) != "expense":
            continue

        category = _normalize_category(transaction.category)
        if category not in RECURRING_BILL_CATEGORIES:
            continue

        description = _normalize_text(transaction.description) or category.title()
        recurring_groups[(category, description)].append((transaction_date, transaction))

    alerts: List[Notification] = []
    changed = False

    for (_, description), entries in recurring_groups.items():
        entries.sort(key=lambda item: item[0])
        if len({_month_key(date_value) for date_value, _ in entries}) < 2:
            continue

        if any(_month_key(date_value) == current_month for date_value, _ in entries):
            continue

        recent_days = [date_value.day for date_value, _ in entries[-3:]]
        expected_day = Counter(recent_days).most_common(1)[0][0]
        current_month_last_day = calendar.monthrange(now.year, now.month)[1]
        due_date = now.replace(
            day=min(expected_day, current_month_last_day),
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        days_until_due = (due_date.date() - now.date()).days

        if days_until_due < 0 or days_until_due > 5:
            continue

        _, last_transaction = entries[-1]
        title = f"Upcoming Bill: {description}"
        if _notification_exists(user_id, "bill", title, db, month_start):
            continue

        due_phrase = (
            "today"
            if days_until_due == 0
            else "tomorrow"
            if days_until_due == 1
            else f"in {days_until_due} days"
        )
        notification = Notification(
            user_id=user_id,
            type="bill",
            title=title,
            message=(
                f"Based on your earlier entries, {description} is usually due {due_phrase}. "
                f"Last recorded amount: ${float(last_transaction.amount or 0):,.2f}."
            ),
            severity="warning",
        )
        _restore_notification_state(notification, preserved_state)
        db.add(notification)
        db.flush()
        alerts.append(notification)
        changed = True

    if changed:
        db.commit()
        for alert in alerts:
            db.refresh(alert)

    return alerts


def _generate_spending_alerts(
    user_id: int,
    db: Session,
    transactions: List[Transaction],
    now: datetime,
    preserved_state: Dict,
) -> List[Notification]:
    current_month = _month_key(now)
    previous_month = _month_key(now - relativedelta(months=1))
    month_start = _start_of_month(now)

    current_spent = 0.0
    previous_spent = 0.0

    for transaction in transactions:
        transaction_date = _parse_transaction_date(transaction.date)
        if transaction_date is None or _normalize_transaction_type(transaction.type) != "expense":
            continue

        if _month_key(transaction_date) == current_month:
            current_spent += float(transaction.amount or 0)
        elif _month_key(transaction_date) == previous_month:
            previous_spent += float(transaction.amount or 0)

    if previous_spent <= 0 or current_spent <= previous_spent * 1.3:
        return []

    title = "Spending Increase Detected"
    if _notification_exists(user_id, "lifestyle", title, db, month_start):
        return []

    pct_increase = round((current_spent - previous_spent) / previous_spent * 100)
    notification = Notification(
        user_id=user_id,
        type="lifestyle",
        title=title,
        message=(
            f"Your spending this month is {pct_increase}% higher than last month "
            f"(${current_spent:,.2f} vs ${previous_spent:,.2f})."
        ),
        severity="warning",
    )
    _restore_notification_state(notification, preserved_state)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return [notification]


def _generate_monthly_summary(
    user_id: int,
    db: Session,
    transactions: List[Transaction],
    now: datetime,
    preserved_state: Dict,
) -> List[Notification]:
    current_month = _month_key(now)
    month_start = _start_of_month(now)
    title = f"Monthly Summary - {now.strftime('%B %Y')}"

    if _notification_exists(user_id, "ai", title, db, month_start):
        return []

    income = 0.0
    expenses = 0.0
    activity_count = 0

    for transaction in transactions:
        transaction_date = _parse_transaction_date(transaction.date)
        if transaction_date is None or _month_key(transaction_date) != current_month:
            continue

        transaction_type = _normalize_transaction_type(transaction.type)
        if transaction_type == "income":
            income += float(transaction.amount or 0)
            activity_count += 1
        elif transaction_type == "expense":
            expenses += float(transaction.amount or 0)
            activity_count += 1

    if activity_count == 0:
        return []

    savings = income - expenses
    savings_rate = round(savings / max(income, 1) * 100, 1)

    notification = Notification(
        user_id=user_id,
        type="ai",
        title=title,
        message=(
            f"Income: ${income:,.2f} | Expenses: ${expenses:,.2f} | "
            f"Savings: ${savings:,.2f} ({savings_rate}% rate)"
        ),
        severity="info",
    )
    _restore_notification_state(notification, preserved_state)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return [notification]
