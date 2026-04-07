"""
Behavior & Lifestyle Profiling Engine for SnapSpend AI.
Analyzes transaction history to determine spending personality, lifestyle patterns,
impulsive buying risk, and consumption style.
"""

from collections import defaultdict
from datetime import datetime


def generate_full_profile(transactions, incomes=None) -> dict:
    """
    Generate a comprehensive behavior profile from transaction and income data.
    Returns a full profiling result with personality, lifestyle, habits, impulse risk,
    consumption style, and trend analysis.
    """
    if not transactions:
        return _default_profile()

    expenses = [t for t in transactions if t.type == "expense"]
    income_txns = [t for t in transactions if t.type == "income"]
    total_spent = sum(t.amount for t in expenses)
    total_income = sum(t.amount for t in income_txns)

    # Add income from Income model
    if incomes:
        total_income += sum(i.amount for i in incomes)

    categories = {}
    for t in expenses:
        categories[t.category] = categories.get(t.category, 0) + t.amount

    # ── Spending Personality ──
    savings_ratio = (total_income - total_spent) / total_income if total_income > 0 else 0

    if savings_ratio > 0.35:
        personality_type = "Disciplined Saver"
        score = min(95, int(savings_ratio * 100) + 55)
        description = "You demonstrate exceptional financial discipline with a strong savings habit."
    elif savings_ratio > 0.2:
        personality_type = "Smart Saver"
        score = min(85, int(savings_ratio * 100) + 45)
        description = "You maintain a healthy balance between spending and saving."
    elif savings_ratio > 0.1:
        personality_type = "Balanced Spender"
        score = int(savings_ratio * 100) + 40
        description = "You spend reasonably but could improve your savings rate."
    elif savings_ratio > 0:
        personality_type = "Moderate Spender"
        score = int(savings_ratio * 100) + 30
        description = "You tend to spend most of your income. Consider reducing discretionary spending."
    else:
        personality_type = "High Spender"
        score = max(15, int(savings_ratio * 100) + 25)
        description = "Your expenses exceed your income. Immediate budgeting intervention recommended."

    # Personality traits
    traits = []
    if savings_ratio > 0.2:
        traits.append("Budget-conscious")
    if savings_ratio > 0.35:
        traits.append("Financial planner")
    if categories.get("shopping", 0) > total_spent * 0.2:
        traits.append("Occasional impulse buyer")
    if categories.get("food", 0) + categories.get("groceries", 0) > total_spent * 0.25:
        traits.append("Food enthusiast")
    if categories.get("entertainment", 0) + categories.get("subscriptions", 0) > total_spent * 0.15:
        traits.append("Entertainment seeker")
    if categories.get("health", 0) + categories.get("education", 0) > total_spent * 0.1:
        traits.append("Self-improvement focused")
    if categories.get("travel", 0) > total_spent * 0.1:
        traits.append("Travel enthusiast")
    if not traits:
        traits.append("Moderate lifestyle")

    # ── Lifestyle Type ──
    if total_income > 8000:
        lifestyle_type = "Premium Lifestyle"
    elif total_income > 5000:
        lifestyle_type = "Urban Professional"
    elif total_income > 3000:
        lifestyle_type = "Comfortable Living"
    elif total_income > 1500:
        lifestyle_type = "Budget Conscious"
    else:
        lifestyle_type = "Frugal Living"

    lifestyle_categories = [
        {"name": "Dining Out", "score": min(100, int((categories.get("food", 0) / max(total_spent, 1)) * 400))},
        {"name": "Tech & Gadgets", "score": min(100, int((categories.get("shopping", 0) / max(total_spent, 1)) * 300))},
        {"name": "Health & Fitness", "score": min(100, int((categories.get("health", 0) / max(total_spent, 1)) * 500))},
        {"name": "Travel", "score": min(100, int((categories.get("travel", 0) / max(total_spent, 1)) * 400))},
        {"name": "Entertainment", "score": min(100, int((categories.get("entertainment", 0) / max(total_spent, 1)) * 500))},
        {"name": "Fashion", "score": min(100, int((categories.get("shopping", 0) / max(total_spent, 1)) * 200))},
        {"name": "Education", "score": min(100, int((categories.get("education", 0) / max(total_spent, 1)) * 500))},
    ]

    # ── Habit Patterns ──
    habit_patterns = []
    habit_map = {
        "food": "Dining Out",
        "shopping": "Online Shopping",
        "transport": "Ride Sharing",
        "entertainment": "Entertainment",
        "subscriptions": "Digital Subscriptions",
        "health": "Healthcare Spending",
        "groceries": "Grocery Shopping",
    }
    for cat, habit_name in habit_map.items():
        cat_amount = categories.get(cat, 0)
        if cat_amount > 0:
            cat_txns = [t for t in expenses if t.category == cat]
            avg_cost = cat_amount / max(1, len(cat_txns))
            pct = cat_amount / max(total_spent, 1)
            if pct > 0.2:
                risk = "high"
                frequency = "Frequent"
            elif pct > 0.1:
                risk = "medium"
                frequency = "Regular"
            else:
                risk = "low"
                frequency = "Occasional"
            habit_patterns.append({
                "habit": habit_name,
                "frequency": frequency,
                "avgCost": round(avg_cost, 2),
                "monthlyImpact": round(cat_amount, 2),
                "risk": risk,
            })

    if not habit_patterns:
        habit_patterns.append({"habit": "No data yet", "frequency": "-", "avgCost": 0, "monthlyImpact": 0, "risk": "low"})

    # ── Impulse Buying Risk ──
    impulse_score = min(100, int(
        (categories.get("shopping", 0) + categories.get("entertainment", 0)) / max(total_spent, 1) * 250
    ))

    impulse_factors = []
    if categories.get("shopping", 0) > total_spent * 0.15:
        impulse_factors.append(f"Shopping is {round(categories.get('shopping', 0) / max(total_spent, 1) * 100)}% of spending")
    if categories.get("entertainment", 0) > total_spent * 0.1:
        impulse_factors.append(f"Entertainment is {round(categories.get('entertainment', 0) / max(total_spent, 1) * 100)}% of spending")
    if not impulse_factors:
        impulse_factors.append("Spending patterns appear controlled")

    # ── Consumption Style ──
    essential_cats = ["rent", "bills", "groceries", "health", "education", "transport"]
    lifestyle_cats_list = ["food", "entertainment", "subscriptions"]
    luxury_cats = ["travel", "shopping"]

    essential = sum(categories.get(c, 0) for c in essential_cats)
    lifestyle_total = sum(categories.get(c, 0) for c in lifestyle_cats_list)
    luxury = sum(categories.get(c, 0) for c in luxury_cats)
    impulse_est = total_spent * 0.05

    consumption_total = max(essential + lifestyle_total + luxury + impulse_est, 1)
    consumption_style = [
        {"category": "Essential", "percentage": round(essential / consumption_total * 100)},
        {"category": "Lifestyle", "percentage": round(lifestyle_total / consumption_total * 100)},
        {"category": "Luxury", "percentage": round(luxury / consumption_total * 100)},
        {"category": "Impulse", "percentage": max(5, round(impulse_est / consumption_total * 100))},
    ]

    # ── Month-over-Month Trends ──
    monthly_spending = defaultdict(float)
    for t in expenses:
        month_key = t.date[:7] if t.date and len(t.date) >= 7 else "unknown"
        monthly_spending[month_key] += t.amount

    trend_data = []
    sorted_months = sorted(monthly_spending.keys())
    for i, month in enumerate(sorted_months):
        change = 0
        if i > 0:
            prev = monthly_spending[sorted_months[i - 1]]
            change = round((monthly_spending[month] - prev) / max(prev, 1) * 100, 1)
        try:
            dt = datetime.strptime(month, "%Y-%m")
            month_name = dt.strftime("%b %Y")
        except ValueError:
            month_name = month
        trend_data.append({
            "month": month_name,
            "spending": round(monthly_spending[month], 2),
            "change": change,
        })

    return {
        "spendingPersonality": {
            "type": personality_type,
            "score": score,
            "description": description,
            "traits": traits,
        },
        "lifestyleType": {
            "type": lifestyle_type,
            "categories": lifestyle_categories,
        },
        "habitPatterns": habit_patterns,
        "impulsiveBuyingRisk": {
            "score": impulse_score,
            "level": "Low" if impulse_score < 30 else "Medium" if impulse_score < 60 else "High",
            "factors": impulse_factors,
        },
        "consumptionStyle": consumption_style,
        "trends": trend_data,
        "financialHealth": {
            "savingsRate": round(savings_ratio * 100, 1),
            "totalIncome": round(total_income, 2),
            "totalExpenses": round(total_spent, 2),
            "netSavings": round(total_income - total_spent, 2),
        },
    }


def _default_profile() -> dict:
    """Return default profile when no data is available."""
    return {
        "spendingPersonality": {
            "type": "New User",
            "score": 50,
            "description": "Start adding transactions to get personalized insights.",
            "traits": ["New to SnapSpend"],
        },
        "lifestyleType": {"type": "Unknown", "categories": []},
        "habitPatterns": [{"habit": "No data yet", "frequency": "-", "avgCost": 0, "monthlyImpact": 0, "risk": "low"}],
        "impulsiveBuyingRisk": {"score": 0, "level": "Unknown", "factors": ["Not enough data"]},
        "consumptionStyle": [
            {"category": "Essential", "percentage": 50},
            {"category": "Lifestyle", "percentage": 25},
            {"category": "Luxury", "percentage": 15},
            {"category": "Impulse", "percentage": 10},
        ],
        "trends": [],
        "financialHealth": {
            "savingsRate": 0,
            "totalIncome": 0,
            "totalExpenses": 0,
            "netSavings": 0,
        },
    }
