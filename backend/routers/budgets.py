from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from database import get_db
from models.user import User
from models.budget import Budget
from models.transaction import Transaction
from schemas.budget import BudgetCreate, BudgetUpdate
from services.auth_service import get_current_user
from services.gemini_service import generate_budget_recommendations

router = APIRouter(prefix="/api/budgets", tags=["Budget Planning"])


@router.get("")
def get_budgets(
    month: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List budgets, optionally filtered by month."""
    query = db.query(Budget).filter(Budget.user_id == user.id)
    if month:
        query = query.filter(Budget.month == month)

    budgets = query.all()

    # Recalculate spent amounts from actual transactions
    for budget in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.date.like(f"{budget.month}%"),
        ).scalar() or 0
        budget.spent = round(spent, 2)

    db.commit()
    return [b.to_dict() for b in budgets]


@router.post("", status_code=201)
def create_budget(
    data: BudgetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new budget."""
    if data.limit <= 0:
        raise HTTPException(status_code=400, detail={"message": "Budget limit must be greater than 0"})

    from datetime import datetime
    month = data.month or datetime.utcnow().strftime("%Y-%m")

    existing = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.category == data.category,
        Budget.month == month,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail={"message": "Budget already exists for this category and month"})

    budget = Budget(
        user_id=user.id,
        category=data.category,
        limit_amount=data.limit,
        spent=0,
        month=month,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget.to_dict()


@router.put("/{budget_id}")
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a budget."""
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail={"message": "Budget not found"})

    if data.limit is not None:
        if data.limit <= 0:
            raise HTTPException(status_code=400, detail={"message": "Budget limit must be greater than 0"})
        budget.limit_amount = data.limit
    if data.category is not None:
        budget.category = data.category
    if data.month is not None:
        budget.month = data.month

    db.commit()
    db.refresh(budget)
    return budget.to_dict()


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a budget."""
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail={"message": "Budget not found"})

    db.delete(budget)
    db.commit()
    return {"success": True, "message": "Budget deleted"}


@router.get("/recommendations")
def budget_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-generated budget recommendations based on spending patterns."""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.type == "expense",
    ).all()

    income_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == "income",
    ).scalar() or 0

    categories = {}
    for t in transactions:
        categories[t.category] = categories.get(t.category, 0) + t.amount

    # Try Gemini AI recommendations
    ai_recs = generate_budget_recommendations(categories, income_total)
    if ai_recs:
        return {"source": "ai", "recommendations": ai_recs}

    # Fall back to rule-based recommendations
    recommendations = []
    for cat, spent in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        # Suggest 110% of current spending as budget (with some padding)
        suggested = round(spent * 1.1, -1)  # Round to nearest 10
        if suggested < 50:
            suggested = 50
        recommendations.append({
            "category": cat,
            "recommendedLimit": suggested,
            "currentSpending": round(spent, 2),
            "reason": f"Based on your history of ${spent:,.2f} in {cat}",
        })

    # Add untracked categories
    all_categories = ["food", "transport", "shopping", "entertainment", "bills", "health", "groceries"]
    for cat in all_categories:
        if cat not in categories:
            recommendations.append({
                "category": cat,
                "recommendedLimit": 200,
                "currentSpending": 0,
                "reason": f"Recommended starting budget for {cat}",
            })

    return {"source": "rule_based", "recommendations": recommendations}


@router.get("/alerts")
def budget_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get active budget overspending alerts."""
    from datetime import datetime
    current_month = datetime.utcnow().strftime("%Y-%m")

    budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.month == current_month,
    ).all()

    alerts = []
    for budget in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.date.like(f"{current_month}%"),
        ).scalar() or 0

        pct = round(spent / max(budget.limit_amount, 1) * 100)

        if pct >= 100:
            alerts.append({
                "category": budget.category,
                "budget": budget.limit_amount,
                "spent": round(spent, 2),
                "percentage": pct,
                "severity": "danger",
                "message": f"Budget exceeded by ${round(spent - budget.limit_amount, 2):,.2f}",
            })
        elif pct >= 80:
            alerts.append({
                "category": budget.category,
                "budget": budget.limit_amount,
                "spent": round(spent, 2),
                "percentage": pct,
                "severity": "warning",
                "message": f"Approaching budget limit ({pct}% used)",
            })

    return sorted(alerts, key=lambda x: x["percentage"], reverse=True)


@router.get("/comparison")
def budget_comparison(
    month: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get budget vs actual spending comparison."""
    from datetime import datetime
    target_month = month or datetime.utcnow().strftime("%Y-%m")

    budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.month == target_month,
    ).all()

    comparison = []
    for budget in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.date.like(f"{target_month}%"),
        ).scalar() or 0

        comparison.append({
            "category": budget.category,
            "budgeted": budget.limit_amount,
            "actual": round(spent, 2),
            "difference": round(budget.limit_amount - spent, 2),
            "percentage": round(spent / max(budget.limit_amount, 1) * 100),
            "status": "under" if spent <= budget.limit_amount else "over",
        })

    total_budgeted = sum(c["budgeted"] for c in comparison)
    total_actual = sum(c["actual"] for c in comparison)

    return {
        "month": target_month,
        "categories": comparison,
        "totals": {
            "budgeted": round(total_budgeted, 2),
            "actual": round(total_actual, 2),
            "difference": round(total_budgeted - total_actual, 2),
            "percentage": round(total_actual / max(total_budgeted, 1) * 100),
        },
    }
