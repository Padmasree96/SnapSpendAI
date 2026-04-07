from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from collections import defaultdict

from database import get_db
from models.user import User
from models.account import Account
from models.transaction import Transaction
from schemas.account import AccountCreate, AccountUpdate
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/accounts", tags=["Accounts & Wallets"])


@router.get("")
def get_accounts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all user accounts/wallets."""
    accounts = db.query(Account).filter(Account.user_id == user.id).all()
    return [a.to_dict() for a in accounts]


@router.post("", status_code=201)
def create_account(
    data: AccountCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new account/wallet."""
    account = Account(
        user_id=user.id,
        name=data.name,
        type=data.type,
        balance=data.balance or 0,
        icon=data.icon or "💵",
        color=data.color or "#3b82f6",
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account.to_dict()


@router.put("/{account_id}")
def update_account(
    account_id: int,
    data: AccountUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an account."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail={"message": "Account not found"})

    if data.name is not None:
        account.name = data.name
    if data.type is not None:
        account.type = data.type
    if data.balance is not None:
        account.balance = data.balance
    if data.icon is not None:
        account.icon = data.icon
    if data.color is not None:
        account.color = data.color

    db.commit()
    db.refresh(account)
    return account.to_dict()


@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an account."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail={"message": "Account not found"})

    db.delete(account)
    db.commit()
    return {"success": True, "message": "Account deleted"}


@router.get("/summary")
def accounts_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get summary of all accounts including total balance and net worth."""
    accounts = db.query(Account).filter(Account.user_id == user.id).all()
    total_balance = sum(a.balance for a in accounts)

    by_type = defaultdict(float)
    for a in accounts:
        by_type[a.type] += a.balance

    return {
        "totalBalance": round(total_balance, 2),
        "accountCount": len(accounts),
        "byType": {k: round(v, 2) for k, v in by_type.items()},
        "accounts": [a.to_dict() for a in accounts],
    }


@router.get("/{account_id}/analytics")
def account_analytics(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get per-account income/expense breakdown and monthly trends."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail={"message": "Account not found"})

    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.account_id == account_id,
    ).all()

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expenses = sum(t.amount for t in transactions if t.type == "expense")

    # Category breakdown
    categories = {}
    for t in transactions:
        if t.type == "expense":
            categories[t.category] = categories.get(t.category, 0) + t.amount

    # Monthly trends
    monthly = defaultdict(lambda: {"income": 0, "expenses": 0})
    for t in transactions:
        month_key = t.date[:7] if t.date and len(t.date) >= 7 else "unknown"
        if t.type == "income":
            monthly[month_key]["income"] += t.amount
        else:
            monthly[month_key]["expenses"] += t.amount

    month_names = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May",
        "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct",
        "11": "Nov", "12": "Dec",
    }
    trends = []
    for mk in sorted(monthly.keys()):
        mm = mk.split("-")[1] if "-" in mk else mk
        data = monthly[mk]
        trends.append({
            "month": month_names.get(mm, mm),
            "income": round(data["income"], 2),
            "expenses": round(data["expenses"], 2),
        })

    return {
        "account": account.to_dict(),
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "netFlow": round(total_income - total_expenses, 2),
        "transactionCount": len(transactions),
        "categoryBreakdown": {k: round(v, 2) for k, v in sorted(categories.items(), key=lambda x: x[1], reverse=True)},
        "monthlyTrends": trends,
    }


@router.get("/{account_id}/transactions")
def account_transactions(
    account_id: int,
    limit: Optional[int] = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get transactions scoped to a specific account."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail={"message": "Account not found"})

    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.account_id == account_id,
    ).order_by(Transaction.date.desc()).limit(limit).all()

    return [t.to_dict() for t in transactions]
