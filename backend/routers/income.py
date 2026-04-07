from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from collections import defaultdict

from database import get_db
from models.user import User
from models.income import Income
from schemas.income import IncomeCreate, IncomeUpdate
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/income", tags=["Income Management"])


@router.get("")
def get_incomes(
    source: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List incomes with optional filters."""
    query = db.query(Income).filter(Income.user_id == user.id)

    if source and source != "all":
        query = query.filter(Income.source == source)
    if category and category != "all":
        query = query.filter(Income.category == category)
    if date_from:
        query = query.filter(Income.date >= date_from)
    if date_to:
        query = query.filter(Income.date <= date_to)

    query = query.order_by(Income.date.desc(), Income.created_at.desc())
    if limit:
        query = query.limit(limit)

    incomes = query.all()
    return [i.to_dict() for i in incomes]


@router.post("", status_code=201)
def create_income(
    data: IncomeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new income entry."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail={"message": "Amount must be greater than 0"})

    income = Income(
        user_id=user.id,
        amount=data.amount,
        source=data.source,
        category=data.category or "general",
        description=data.description,
        date=data.date,
        recurring=data.recurring or False,
        notes=data.notes,
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return income.to_dict()


@router.put("/{income_id}")
def update_income(
    income_id: int,
    data: IncomeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit an income entry."""
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user.id).first()
    if not income:
        raise HTTPException(status_code=404, detail={"message": "Income not found"})

    if data.amount is not None:
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail={"message": "Amount must be greater than 0"})
        income.amount = data.amount
    if data.source is not None:
        income.source = data.source
    if data.category is not None:
        income.category = data.category
    if data.description is not None:
        income.description = data.description
    if data.date is not None:
        income.date = data.date
    if data.recurring is not None:
        income.recurring = data.recurring
    if data.notes is not None:
        income.notes = data.notes

    db.commit()
    db.refresh(income)
    return income.to_dict()


@router.delete("/{income_id}")
def delete_income(
    income_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an income entry."""
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user.id).first()
    if not income:
        raise HTTPException(status_code=404, detail={"message": "Income not found"})

    db.delete(income)
    db.commit()
    return {"success": True, "message": "Income deleted"}


@router.get("/summary")
def income_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get monthly income summary grouped by source and category."""
    incomes = db.query(Income).filter(Income.user_id == user.id).all()

    total = sum(i.amount for i in incomes)

    # By source
    by_source = defaultdict(float)
    for i in incomes:
        by_source[i.source] += i.amount

    # By category
    by_category = defaultdict(float)
    for i in incomes:
        by_category[i.category] += i.amount

    # Monthly breakdown
    monthly = defaultdict(float)
    for i in incomes:
        month_key = i.date[:7] if i.date and len(i.date) >= 7 else "unknown"
        monthly[month_key] += i.amount

    month_names = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May",
        "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct",
        "11": "Nov", "12": "Dec",
    }
    monthly_list = []
    for mk in sorted(monthly.keys()):
        mm = mk.split("-")[1] if "-" in mk else mk
        monthly_list.append({"month": month_names.get(mm, mm), "amount": round(monthly[mk], 2)})

    return {
        "totalIncome": round(total, 2),
        "bySource": {k: round(v, 2) for k, v in sorted(by_source.items(), key=lambda x: x[1], reverse=True)},
        "byCategory": {k: round(v, 2) for k, v in sorted(by_category.items(), key=lambda x: x[1], reverse=True)},
        "monthly": monthly_list,
        "recurringCount": len([i for i in incomes if i.recurring]),
        "incomeCount": len(incomes),
    }
