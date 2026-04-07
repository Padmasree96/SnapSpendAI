from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.transaction import Transaction
from models.user import User
from services.auth_service import get_current_user
from services.financial_summary_service import (
    build_financial_summary,
    get_user_financial_entries,
    group_entries_by_month,
    normalize_category,
    normalize_transaction_type,
    parse_financial_date,
    serialize_monthly_totals,
)

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])


def _parse_month_filter(month: Optional[str]):
    if not month:
        return None

    try:
        parsed = datetime.strptime(month, "%Y-%m")
    except ValueError:
        return None

    return parsed.year, parsed.month


@router.get("/monthly")
def monthly_report(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Monthly income/expense/savings report."""
    entries = get_user_financial_entries(user.id, db)
    return serialize_monthly_totals(group_entries_by_month(entries))


@router.get("/category-spending")
def category_spending(
    month: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Category-wise spending breakdown."""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.type == "expense",
    ).all()
    month_filter = _parse_month_filter(month)

    CATEGORY_COLORS = {
        "food": "#f59e0b", "transport": "#3b82f6", "shopping": "#8b5cf6",
        "entertainment": "#ec4899", "bills": "#ef4444", "health": "#10b981",
        "education": "#06b6d4", "travel": "#f97316", "groceries": "#84cc16",
        "rent": "#6366f1", "subscriptions": "#a855f7", "others": "#78716c",
    }
    CATEGORY_NAMES = {
        "food": "Food & Dining", "transport": "Transportation", "shopping": "Shopping",
        "entertainment": "Entertainment", "bills": "Bills & Utilities", "health": "Healthcare",
        "education": "Education", "travel": "Travel", "groceries": "Groceries",
        "rent": "Rent & Housing", "subscriptions": "Subscriptions", "others": "Others",
    }

    categories = {}
    for transaction in transactions:
        transaction_date = parse_financial_date(transaction.date)
        if transaction_date is None:
            continue
        if month_filter and (transaction_date.year, transaction_date.month) != month_filter:
            continue

        category_key = normalize_category(transaction.category)
        categories[category_key] = categories.get(category_key, 0) + float(transaction.amount or 0)

    result = []
    for cat, value in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        result.append({
            "name": CATEGORY_NAMES.get(cat, cat.title()),
            "value": round(value, 2),
            "color": CATEGORY_COLORS.get(cat, "#78716c"),
        })

    return result


@router.get("/daily")
def daily_spending(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Daily spending distribution by day of week."""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.type == "expense",
    ).all()

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily = {d: 0 for d in day_names}

    for transaction in transactions:
        transaction_date = parse_financial_date(transaction.date)
        if transaction_date is None:
            continue

        day = day_names[transaction_date.weekday()]
        daily[day] += float(transaction.amount or 0)

    return [{"day": d, "amount": round(daily[d], 2)} for d in day_names]


@router.get("/savings-trend")
def savings_trend(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Savings trend over months."""
    entries = get_user_financial_entries(user.id, db)
    monthly = group_entries_by_month(entries)
    return [
        {
            "month": item["month"],
            "savings": item["savings"],
            "target": 1500,
        }
        for item in serialize_monthly_totals(monthly)
    ]


@router.get("/yearly")
def yearly_report(
    year: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Annual income/expense/savings summary."""
    target_year = int(year) if year and year.isdigit() else datetime.utcnow().year
    all_entries = get_user_financial_entries(user.id, db)
    entries = [
        entry for entry in all_entries
        if entry.get("parsed_date") and entry["parsed_date"].year == target_year
    ]
    summary = build_financial_summary(entries)
    total_income = summary["totalIncome"]
    total_expenses = summary["totalExpenses"]
    savings = summary["netBalance"]
    monthly_data = summary["monthly"]

    # Category summary
    categories = {}
    for entry in entries:
        if entry.get("type") == "expense":
            category_key = normalize_category(entry.get("category"))
            categories[category_key] = categories.get(category_key, 0) + float(entry.get("amount") or 0)

    return {
        "year": str(target_year),
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "netSavings": round(savings, 2),
        "savingsRate": round(savings / max(total_income, 1) * 100, 1),
        "transactionCount": len(entries),
        "avgMonthlyExpense": round(total_expenses / 12, 2),
        "avgMonthlyIncome": round(total_income / 12, 2),
        "monthly": monthly_data,
        "categoryBreakdown": {k: round(v, 2) for k, v in sorted(categories.items(), key=lambda x: x[1], reverse=True)},
    }


@router.get("/income-vs-expense")
def income_vs_expense(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Income vs expense comparison with ratios."""
    entries = get_user_financial_entries(user.id, db)
    summary = build_financial_summary(entries)
    total_income = summary["totalIncome"]
    total_expenses = summary["totalExpenses"]
    savings = summary["netBalance"]

    comparison = []
    for item in summary["monthly"]:
        comparison.append({
            "month": item["month"],
            "income": item["income"],
            "expenses": item["expenses"],
            "savings": item["savings"],
            "ratio": round(item["expenses"] / max(item["income"], 1) * 100, 1),
        })

    return {
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "netSavings": round(savings, 2),
        "savingsRate": round(savings / max(total_income, 1) * 100, 1),
        "expenseToIncomeRatio": round(total_expenses / max(total_income, 1) * 100, 1),
        "monthly": comparison,
    }


@router.get("/lifestyle-costs")
def lifestyle_costs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI-powered lifestyle cost breakdown."""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.type == "expense",
    ).all()

    total_spent = sum(t.amount for t in transactions)
    categories = {}
    for transaction in transactions:
        category_key = normalize_category(transaction.category)
        categories[category_key] = categories.get(category_key, 0) + float(transaction.amount or 0)

    # Categorize into lifestyle groups
    essential_cats = {"rent": "Housing", "bills": "Utilities", "groceries": "Food Essentials", "health": "Healthcare", "transport": "Transportation"}
    lifestyle_cats = {"food": "Dining & Restaurants", "entertainment": "Entertainment", "subscriptions": "Digital Subscriptions"}
    luxury_cats = {"travel": "Travel & Vacation", "shopping": "Shopping & Fashion"}

    groups = {
        "Essential": {"categories": [], "total": 0},
        "Lifestyle": {"categories": [], "total": 0},
        "Luxury": {"categories": [], "total": 0},
        "Other": {"categories": [], "total": 0},
    }

    for cat, amount in categories.items():
        if cat in essential_cats:
            groups["Essential"]["categories"].append({"name": essential_cats[cat], "amount": round(amount, 2)})
            groups["Essential"]["total"] += amount
        elif cat in lifestyle_cats:
            groups["Lifestyle"]["categories"].append({"name": lifestyle_cats[cat], "amount": round(amount, 2)})
            groups["Lifestyle"]["total"] += amount
        elif cat in luxury_cats:
            groups["Luxury"]["categories"].append({"name": luxury_cats[cat], "amount": round(amount, 2)})
            groups["Luxury"]["total"] += amount
        else:
            groups["Other"]["categories"].append({"name": cat.title(), "amount": round(amount, 2)})
            groups["Other"]["total"] += amount

    for group in groups.values():
        group["total"] = round(group["total"], 2)
        group["percentage"] = round(group["total"] / max(total_spent, 1) * 100, 1)

    return {
        "totalSpending": round(total_spent, 2),
        "groups": groups,
    }
