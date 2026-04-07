from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.user import User
from models.transaction import Transaction
from schemas.transaction import TransactionCreate, TransactionUpdate
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.get("")
def get_transactions(
    type: Optional[str] = None,
    category: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = "",
    limit: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List transactions with optional filters."""
    query = db.query(Transaction).filter(Transaction.user_id == user.id)

    if type:
        query = query.filter(Transaction.type == type)
    if category and category != "all":
        query = query.filter(Transaction.category == category)
    if date:
        query = query.filter(Transaction.date == date)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search.lower()}%"))

    query = query.order_by(Transaction.date.desc(), Transaction.created_at.desc())

    if limit:
        query = query.limit(limit)

    transactions = query.all()
    return [t.to_dict() for t in transactions]


@router.post("", status_code=201)
def create_transaction(
    data: TransactionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new transaction."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail={"message": "Amount must be greater than 0"})

    transaction = Transaction(
        user_id=user.id,
        type=data.type,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=data.date,
        account_id=int(data.account) if data.account else None,
        image_path=data.image,
        ai_detected=data.aiDetected or False,
        confidence=data.confidence,
        notes=data.notes,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction.to_dict()


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail={"message": "Transaction not found"})

    if data.description is not None:
        transaction.description = data.description
    if data.amount is not None:
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail={"message": "Amount must be greater than 0"})
        transaction.amount = data.amount
    if data.category is not None:
        transaction.category = data.category
    if data.date is not None:
        transaction.date = data.date
    if data.account is not None:
        transaction.account_id = int(data.account)
    if data.notes is not None:
        transaction.notes = data.notes

    db.commit()
    db.refresh(transaction)
    return transaction.to_dict()


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail={"message": "Transaction not found"})

    db.delete(transaction)
    db.commit()
    return {"success": True, "message": "Transaction deleted"}


@router.get("/summary")
def get_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get monthly summary statistics."""
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expenses = sum(t.amount for t in transactions if t.type == "expense")
    ai_detected = len([t for t in transactions if t.ai_detected])

    # Category breakdown
    categories = {}
    for t in transactions:
        if t.type == "expense":
            categories[t.category] = categories.get(t.category, 0) + t.amount

    return {
        "totalBalance": round(total_income - total_expenses, 2),
        "monthlyIncome": round(total_income, 2),
        "monthlyExpenses": round(total_expenses, 2),
        "savings": round(total_income - total_expenses, 2),
        "transactionCount": len(transactions),
        "aiDetectedCount": ai_detected,
        "categoryBreakdown": categories,
    }
