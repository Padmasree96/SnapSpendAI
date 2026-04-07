"""
Seed the database with demo data for SnapSpend AI.
Usage: python seed_data.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
import models  # noqa: F401 – registers all models with Base

from models.user import User
from models.transaction import Transaction
from models.account import Account
from models.budget import Budget
from models.notification import ChatMessage
from services.notification_service import generate_notifications_for_user


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter_by(email="alex@snapspend.ai").first():
            print("⚠️  Database already seeded. Skipping.")
            return

        print("🌱 Seeding database...")

        # --- Create demo user ---
        user = User(name="Alex Johnson", email="alex@snapspend.ai")
        user.set_password("password123")
        user.set_ai_preferences({
            "spendingAlerts": True,
            "savingsTips": True,
            "weeklyDigest": True,
            "lifestyleInsights": True,
        })
        db.add(user)
        db.flush()  # Get user.id

        # --- Accounts ---
        accounts_data = [
            {"name": "Main Savings", "type": "bank", "balance": 12500.00, "icon": "🏦", "color": "#3b82f6"},
            {"name": "Cash Wallet", "type": "cash", "balance": 340.00, "icon": "💵", "color": "#10b981"},
            {"name": "UPI Account", "type": "upi", "balance": 1820.50, "icon": "📱", "color": "#8b5cf6"},
            {"name": "Credit Card", "type": "credit", "balance": -2150.00, "icon": "💳", "color": "#ef4444"},
            {"name": "PayPal", "type": "wallet", "balance": 450.75, "icon": "👛", "color": "#f59e0b"},
        ]
        account_map = {}
        for i, a in enumerate(accounts_data):
            account = Account(user_id=user.id, **a)
            db.add(account)
            db.flush()
            account_map[str(i + 1)] = account.id

        # --- Transactions ---
        transactions_data = [
            {"type": "expense", "amount": 45.00, "category": "food", "description": "Dinner at Italian Restaurant", "date": "2026-02-10", "account": "1", "ai_detected": False},
            {"type": "expense", "amount": 120.00, "category": "shopping", "description": "Amazon - Headphones", "date": "2026-02-09", "account": "4", "ai_detected": True, "confidence": 94},
            {"type": "expense", "amount": 35.50, "category": "transport", "description": "Uber rides", "date": "2026-02-09", "account": "3", "ai_detected": False},
            {"type": "income", "amount": 4500.00, "category": "salary", "description": "Monthly Salary - Feb", "date": "2026-02-01", "account": "1"},
            {"type": "expense", "amount": 89.99, "category": "subscriptions", "description": "Netflix + Spotify + iCloud", "date": "2026-02-01", "account": "4", "ai_detected": False},
            {"type": "expense", "amount": 250.00, "category": "bills", "description": "Electricity Bill", "date": "2026-02-05", "account": "1", "ai_detected": True, "confidence": 97},
            {"type": "expense", "amount": 65.00, "category": "health", "description": "Pharmacy - Vitamins", "date": "2026-02-07", "account": "2", "ai_detected": False},
            {"type": "income", "amount": 800.00, "category": "freelance", "description": "Web Design Project", "date": "2026-02-04", "account": "3"},
            {"type": "expense", "amount": 150.00, "category": "groceries", "description": "Weekly Grocery Shopping", "date": "2026-02-08", "account": "1", "ai_detected": True, "confidence": 91},
            {"type": "expense", "amount": 1200.00, "category": "rent", "description": "Monthly Rent", "date": "2026-02-01", "account": "1", "ai_detected": False},
            {"type": "expense", "amount": 28.00, "category": "entertainment", "description": "Movie Tickets", "date": "2026-02-06", "account": "2", "ai_detected": False},
            {"type": "income", "amount": 200.00, "category": "investment", "description": "Dividend Income", "date": "2026-02-03", "account": "1"},
            {"type": "expense", "amount": 75.00, "category": "education", "description": "Online Course - React", "date": "2026-02-02", "account": "4", "ai_detected": False},
            {"type": "expense", "amount": 55.00, "category": "food", "description": "Coffee & Lunch", "date": "2026-02-10", "account": "2", "ai_detected": True, "confidence": 88},
            {"type": "expense", "amount": 320.00, "category": "travel", "description": "Weekend Trip - Hotel", "date": "2026-02-08", "account": "4", "ai_detected": False},
            # Historical data for reports
            {"type": "income", "amount": 5200.00, "category": "salary", "description": "Monthly Salary - Sep", "date": "2025-09-01", "account": "1"},
            {"type": "expense", "amount": 3800.00, "category": "bills", "description": "September Expenses", "date": "2025-09-15", "account": "1"},
            {"type": "income", "amount": 5500.00, "category": "salary", "description": "Monthly Salary - Oct", "date": "2025-10-01", "account": "1"},
            {"type": "expense", "amount": 4100.00, "category": "bills", "description": "October Expenses", "date": "2025-10-15", "account": "1"},
            {"type": "income", "amount": 5300.00, "category": "salary", "description": "Monthly Salary - Nov", "date": "2025-11-01", "account": "1"},
            {"type": "expense", "amount": 3600.00, "category": "bills", "description": "November Expenses", "date": "2025-11-15", "account": "1"},
            {"type": "income", "amount": 6200.00, "category": "salary", "description": "Monthly Salary - Dec", "date": "2025-12-01", "account": "1"},
            {"type": "expense", "amount": 5100.00, "category": "shopping", "description": "December Expenses", "date": "2025-12-15", "account": "1"},
            {"type": "income", "amount": 5500.00, "category": "salary", "description": "Monthly Salary - Jan", "date": "2026-01-01", "account": "1"},
            {"type": "expense", "amount": 3900.00, "category": "rent", "description": "January Expenses", "date": "2026-01-15", "account": "1"},
        ]

        for t_data in transactions_data:
            acc_key = t_data.pop("account", "1")
            t = Transaction(
                user_id=user.id,
                account_id=account_map.get(acc_key),
                **t_data,
            )
            db.add(t)

        # --- Budgets ---
        budgets_data = [
            {"category": "food", "limit_amount": 400, "spent": 320, "month": "2026-02"},
            {"category": "transport", "limit_amount": 200, "spent": 185, "month": "2026-02"},
            {"category": "shopping", "limit_amount": 300, "spent": 380, "month": "2026-02"},
            {"category": "entertainment", "limit_amount": 150, "spent": 95, "month": "2026-02"},
            {"category": "bills", "limit_amount": 500, "spent": 250, "month": "2026-02"},
            {"category": "health", "limit_amount": 200, "spent": 65, "month": "2026-02"},
            {"category": "groceries", "limit_amount": 350, "spent": 290, "month": "2026-02"},
            {"category": "subscriptions", "limit_amount": 100, "spent": 89.99, "month": "2026-02"},
        ]
        for b in budgets_data:
            db.add(Budget(user_id=user.id, **b))

        # --- Chat messages ---
        chat_data = [
            {"role": "ai", "content": "Hello! I'm your SnapSpend AI assistant. I can help you understand your finances, give spending advice, and provide personalized insights. What would you like to know?"},
            {"role": "user", "content": "How much did I spend on food this month?"},
            {"role": "ai", "content": "This month, you've spent **$320** on Food & Dining, which is **80%** of your $400 budget. You have $80 remaining for the rest of February.\n\n💡 **Tip:** Your food spending is highest on weekends. Consider meal prepping to save around $50-80/month."},
            {"role": "user", "content": "What are my biggest expenses?"},
            {"role": "ai", "content": "Here are your top 3 expenses this month:\n\n1. 🏠 **Rent & Housing** - $1,200 (49%)\n2. 🛍️ **Shopping** - $380 (16%)\n3. 🍔 **Food & Dining** - $320 (13%)\n\n⚠️ Your shopping spending exceeded the budget by $80. I recommend reviewing your recent purchases to identify non-essential items."},
        ]
        for c in chat_data:
            db.add(ChatMessage(user_id=user.id, **c))

        db.commit()
        generated_notifications = generate_notifications_for_user(user.id, db)
        print("✅ Database seeded successfully!")
        print(f"   📧 Demo login: alex@snapspend.ai / password123")
        print(f"   📊 {len(transactions_data)} transactions")
        print(f"   🏦 {len(accounts_data)} accounts")
        print(f"   📋 {len(budgets_data)} budgets")
        print(f"   🔔 {len(generated_notifications)} notifications")
        print(f"   💬 {len(chat_data)} chat messages")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
