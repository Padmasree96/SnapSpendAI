from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.income import Income
from models.transaction import Transaction

SUPPORTED_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%m/%d/%Y",
    "%m-%d-%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
)


def parse_financial_date(raw_date: Optional[str]) -> Optional[datetime]:
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


def normalize_transaction_type(transaction_type: Optional[str]) -> Optional[str]:
    normalized = str(transaction_type or "").strip().lower()
    if normalized in {"income", "expense"}:
        return normalized
    return None


def normalize_category(category: Optional[str]) -> str:
    normalized = str(category or "").strip().lower()
    return normalized or "others"


def month_label(year: int, month: int) -> str:
    return datetime(year, month, 1).strftime("%b %Y")


def get_user_financial_entries(user_id: int, db: Session):
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    incomes = db.query(Income).filter(Income.user_id == user_id).all()

    entries = []

    for transaction in transactions:
        transaction_type = normalize_transaction_type(transaction.type)
        if transaction_type is None:
            continue

        entries.append({
            "id": f"transaction-{transaction.id}",
            "type": transaction_type,
            "amount": float(transaction.amount or 0),
            "category": normalize_category(transaction.category),
            "description": transaction.description,
            "date": transaction.date,
            "parsed_date": parse_financial_date(transaction.date) or transaction.created_at,
            "created_at": transaction.created_at,
            "account": str(transaction.account_id) if transaction.account_id else None,
            "aiDetected": bool(transaction.ai_detected),
            "confidence": transaction.confidence,
            "source": "transaction",
        })

    for income in incomes:
        entries.append({
            "id": f"income-{income.id}",
            "type": "income",
            "amount": float(income.amount or 0),
            "category": normalize_category(income.category or income.source),
            "description": income.description,
            "date": income.date,
            "parsed_date": parse_financial_date(income.date) or income.created_at,
            "created_at": income.created_at,
            "account": None,
            "aiDetected": False,
            "confidence": None,
            "source": "income",
        })

    return entries


def group_entries_by_month(entries):
    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})

    for entry in entries:
        entry_date = entry.get("parsed_date")
        entry_type = entry.get("type")
        if entry_date is None or entry_type not in {"income", "expense"}:
            continue

        month_key = (entry_date.year, entry_date.month)
        bucket = "income" if entry_type == "income" else "expenses"
        monthly[month_key][bucket] += float(entry.get("amount") or 0)

    return monthly


def serialize_monthly_totals(monthly):
    result = []

    for (year, month) in sorted(monthly.keys()):
        data = monthly[(year, month)]
        income = round(data["income"], 2)
        expenses = round(data["expenses"], 2)
        savings = round(income - expenses, 2)
        result.append({
            "month": month_label(year, month),
            "income": income,
            "expenses": expenses,
            "savings": savings,
        })

    return result


def build_financial_summary(entries):
    total_income = 0.0
    total_expenses = 0.0
    category_breakdown = defaultdict(float)

    for entry in entries:
        amount = float(entry.get("amount") or 0)
        if entry.get("type") == "income":
            total_income += amount
        elif entry.get("type") == "expense":
            total_expenses += amount
            category_breakdown[normalize_category(entry.get("category"))] += amount

    return {
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "netBalance": round(total_income - total_expenses, 2),
        "monthly": serialize_monthly_totals(group_entries_by_month(entries)),
        "categoryBreakdown": {
            key: round(value, 2)
            for key, value in sorted(category_breakdown.items(), key=lambda item: item[1], reverse=True)
        },
    }
