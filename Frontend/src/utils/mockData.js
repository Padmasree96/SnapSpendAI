// SnapSpend AI - Comprehensive Mock Data

export const CATEGORIES = [
    { id: 'food', name: 'Food & Dining', color: '#f59e0b', icon: '🍔' },
    { id: 'transport', name: 'Transportation', color: '#3b82f6', icon: '🚗' },
    { id: 'shopping', name: 'Shopping', color: '#8b5cf6', icon: '🛍️' },
    { id: 'entertainment', name: 'Entertainment', color: '#ec4899', icon: '🎬' },
    { id: 'bills', name: 'Bills & Utilities', color: '#ef4444', icon: '💡' },
    { id: 'health', name: 'Healthcare', color: '#10b981', icon: '🏥' },
    { id: 'education', name: 'Education', color: '#06b6d4', icon: '📚' },
    { id: 'travel', name: 'Travel', color: '#f97316', icon: '✈️' },
    { id: 'groceries', name: 'Groceries', color: '#84cc16', icon: '🛒' },
    { id: 'rent', name: 'Rent & Housing', color: '#6366f1', icon: '🏠' },
    { id: 'subscriptions', name: 'Subscriptions', color: '#a855f7', icon: '📱' },
    { id: 'others', name: 'Others', color: '#78716c', icon: '📦' },
];

export const INCOME_CATEGORIES = [
    { id: 'salary', name: 'Salary', color: '#10b981', icon: '💰' },
    { id: 'freelance', name: 'Freelance', color: '#3b82f6', icon: '💻' },
    { id: 'business', name: 'Business', color: '#8b5cf6', icon: '🏢' },
    { id: 'investment', name: 'Investment', color: '#f59e0b', icon: '📈' },
    { id: 'others', name: 'Others', color: '#78716c', icon: '💵' },
];

export const ACCOUNT_TYPES = [
    { id: 'cash', name: 'Cash', icon: '💵', color: '#10b981' },
    { id: 'bank', name: 'Bank Account', icon: '🏦', color: '#3b82f6' },
    { id: 'upi', name: 'UPI', icon: '📱', color: '#8b5cf6' },
    { id: 'credit', name: 'Credit Card', icon: '💳', color: '#ef4444' },
    { id: 'wallet', name: 'Digital Wallet', icon: '👛', color: '#f59e0b' },
];

export const mockAccounts = [
    { id: '1', name: 'Main Savings', type: 'bank', balance: 12500.00, icon: '🏦', color: '#3b82f6' },
    { id: '2', name: 'Cash Wallet', type: 'cash', balance: 340.00, icon: '💵', color: '#10b981' },
    { id: '3', name: 'UPI Account', type: 'upi', balance: 1820.50, icon: '📱', color: '#8b5cf6' },
    { id: '4', name: 'Credit Card', type: 'credit', balance: -2150.00, icon: '💳', color: '#ef4444' },
    { id: '5', name: 'PayPal', type: 'wallet', balance: 450.75, icon: '👛', color: '#f59e0b' },
];

export const mockTransactions = [
    { id: '1', type: 'expense', amount: 45.00, category: 'food', description: 'Dinner at Italian Restaurant', date: '2026-02-10', account: '1', image: null, aiDetected: false },
    { id: '2', type: 'expense', amount: 120.00, category: 'shopping', description: 'Amazon - Headphones', date: '2026-02-09', account: '4', image: null, aiDetected: true, confidence: 94 },
    { id: '3', type: 'expense', amount: 35.50, category: 'transport', description: 'Uber rides', date: '2026-02-09', account: '3', image: null, aiDetected: false },
    { id: '4', type: 'income', amount: 4500.00, category: 'salary', description: 'Monthly Salary - Feb', date: '2026-02-01', account: '1' },
    { id: '5', type: 'expense', amount: 89.99, category: 'subscriptions', description: 'Netflix + Spotify + iCloud', date: '2026-02-01', account: '4', image: null, aiDetected: false },
    { id: '6', type: 'expense', amount: 250.00, category: 'bills', description: 'Electricity Bill', date: '2026-02-05', account: '1', image: null, aiDetected: true, confidence: 97 },
    { id: '7', type: 'expense', amount: 65.00, category: 'health', description: 'Pharmacy - Vitamins', date: '2026-02-07', account: '2', image: null, aiDetected: false },
    { id: '8', type: 'income', amount: 800.00, category: 'freelance', description: 'Web Design Project', date: '2026-02-04', account: '3' },
    { id: '9', type: 'expense', amount: 150.00, category: 'groceries', description: 'Weekly Grocery Shopping', date: '2026-02-08', account: '1', image: null, aiDetected: true, confidence: 91 },
    { id: '10', type: 'expense', amount: 1200.00, category: 'rent', description: 'Monthly Rent', date: '2026-02-01', account: '1', image: null, aiDetected: false },
    { id: '11', type: 'expense', amount: 28.00, category: 'entertainment', description: 'Movie Tickets', date: '2026-02-06', account: '2', image: null, aiDetected: false },
    { id: '12', type: 'income', amount: 200.00, category: 'investment', description: 'Dividend Income', date: '2026-02-03', account: '1' },
    { id: '13', type: 'expense', amount: 75.00, category: 'education', description: 'Online Course - React', date: '2026-02-02', account: '4', image: null, aiDetected: false },
    { id: '14', type: 'expense', amount: 55.00, category: 'food', description: 'Coffee & Lunch', date: '2026-02-10', account: '2', image: null, aiDetected: true, confidence: 88 },
    { id: '15', type: 'expense', amount: 320.00, category: 'travel', description: 'Weekend Trip - Hotel', date: '2026-02-08', account: '4', image: null, aiDetected: false },
];

export const mockBudgets = [
    { id: '1', category: 'food', limit: 400, spent: 320, month: '2026-02' },
    { id: '2', category: 'transport', limit: 200, spent: 185, month: '2026-02' },
    { id: '3', category: 'shopping', limit: 300, spent: 380, month: '2026-02' },
    { id: '4', category: 'entertainment', limit: 150, spent: 95, month: '2026-02' },
    { id: '5', category: 'bills', limit: 500, spent: 250, month: '2026-02' },
    { id: '6', category: 'health', limit: 200, spent: 65, month: '2026-02' },
    { id: '7', category: 'groceries', limit: 350, spent: 290, month: '2026-02' },
    { id: '8', category: 'subscriptions', limit: 100, spent: 89.99, month: '2026-02' },
];

export const mockMonthlyData = [
    { month: 'Sep', income: 5200, expenses: 3800, savings: 1400 },
    { month: 'Oct', income: 5500, expenses: 4100, savings: 1400 },
    { month: 'Nov', income: 5300, expenses: 3600, savings: 1700 },
    { month: 'Dec', income: 6200, expenses: 5100, savings: 1100 },
    { month: 'Jan', income: 5500, expenses: 3900, savings: 1600 },
    { month: 'Feb', income: 5500, expenses: 2434, savings: 3066 },
];

export const mockDailyData = [
    { day: 'Mon', amount: 85 },
    { day: 'Tue', amount: 120 },
    { day: 'Wed', amount: 45 },
    { day: 'Thu', amount: 200 },
    { day: 'Fri', amount: 155 },
    { day: 'Sat', amount: 310 },
    { day: 'Sun', amount: 180 },
];

export const mockCategorySpending = [
    { name: 'Food & Dining', value: 320, color: '#f59e0b' },
    { name: 'Rent & Housing', value: 1200, color: '#6366f1' },
    { name: 'Shopping', value: 380, color: '#8b5cf6' },
    { name: 'Transportation', value: 185, color: '#3b82f6' },
    { name: 'Groceries', value: 290, color: '#84cc16' },
    { name: 'Bills & Utilities', value: 250, color: '#ef4444' },
    { name: 'Entertainment', value: 95, color: '#ec4899' },
    { name: 'Subscriptions', value: 90, color: '#a855f7' },
    { name: 'Others', value: 124, color: '#78716c' },
];

export const mockSavingsTrend = [
    { month: 'Sep', savings: 1400, target: 1500 },
    { month: 'Oct', savings: 1400, target: 1500 },
    { month: 'Nov', savings: 1700, target: 1500 },
    { month: 'Dec', savings: 1100, target: 1500 },
    { month: 'Jan', savings: 1600, target: 1500 },
    { month: 'Feb', savings: 3066, target: 1500 },
];

export const mockChatMessages = [
    { id: '1', role: 'ai', content: 'Hello! I\'m your SnapSpend AI assistant. I can help you understand your finances, give spending advice, and provide personalized insights. What would you like to know?', timestamp: '10:00 AM' },
    { id: '2', role: 'user', content: 'How much did I spend on food this month?', timestamp: '10:01 AM' },
    { id: '3', role: 'ai', content: 'This month, you\'ve spent **$320** on Food & Dining, which is **80%** of your $400 budget. You have $80 remaining for the rest of February.\n\n💡 **Tip:** Your food spending is highest on weekends. Consider meal prepping to save around $50-80/month.', timestamp: '10:01 AM' },
    { id: '4', role: 'user', content: 'What are my biggest expenses?', timestamp: '10:02 AM' },
    { id: '5', role: 'ai', content: 'Here are your top 3 expenses this month:\n\n1. 🏠 **Rent & Housing** - $1,200 (49%)\n2. 🛍️ **Shopping** - $380 (16%)\n3. 🍔 **Food & Dining** - $320 (13%)\n\n⚠️ Your shopping spending exceeded the budget by $80. I recommend reviewing your recent purchases to identify non-essential items.', timestamp: '10:02 AM' },
];


export const mockFAQs = [
    { q: 'How does SnapSpend AI detect expenses from images?', a: 'Our AI uses advanced OCR and computer vision to scan receipts, bills, and shopping photos. It automatically extracts the merchant name, amount, date, and categorizes the expense with a confidence score.' },
    { q: 'Is my financial data secure?', a: 'Absolutely. We use bank-level 256-bit AES encryption for all data at rest and TLS 1.3 for data in transit. Your data is never shared with third parties without your explicit consent.' },
    { q: 'How accurate is the AI spending prediction?', a: 'Our AI prediction model analyzes your past 6+ months of spending patterns and achieves 85-92% accuracy. The more data it has, the better the predictions become.' },
    { q: 'Can I export my data?', a: 'Yes! You can export your financial data as CSV, PDF, or Excel files. Go to Data Management in the sidebar to download your reports.' },
    { q: 'How do I set up budget alerts?', a: 'Go to Budget Planning, set your monthly or category-wise budgets, and you\'ll automatically receive alerts when you reach 80% and 100% of your budget limits.' },
    { q: 'What is Spending Personality?', a: 'Spending Personality is an AI-generated profile based on your financial behavior. It considers your spending patterns, saving habits, impulse buying tendency, and lifestyle choices to give you a comprehensive personality assessment.' },
];

const STORAGE_CURRENCY_KEY = 'snapspend-currency';
const STORAGE_LANGUAGE_KEY = 'snapspend-language';

const LANGUAGE_LOCALE_MAP = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    hi: 'hi-IN',
    ta: 'ta-IN',
};

const CURRENCY_LOCALE_MAP = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    INR: 'en-IN',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
    CNY: 'zh-CN',
};

function getStoredPreference(key) {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.localStorage.getItem(key);
}

export const getPreferredCurrency = () => {
    return getStoredPreference(STORAGE_CURRENCY_KEY) || 'INR';
};

export const getPreferredLocale = () => {
    const language = getStoredPreference(STORAGE_LANGUAGE_KEY);
    if (language && LANGUAGE_LOCALE_MAP[language]) {
        return LANGUAGE_LOCALE_MAP[language];
    }

    const currency = getPreferredCurrency();
    return CURRENCY_LOCALE_MAP[currency] || 'en-IN';
};

export const formatCurrency = (amount, currency = getPreferredCurrency()) => {
    const numericAmount = Number(amount) || 0;

    return new Intl.NumberFormat(getPreferredLocale(), {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numericAmount);
};

export const formatDate = (dateStr) => {
    if (!dateStr) {
        return '';
    }

    const isoDate = String(dateStr).split('T')[0];
    const [year, month, day] = isoDate.split('-').map(Number);

    let date = null;
    if (year && month && day) {
        date = new Date(year, month - 1, day);
    } else {
        const parsed = new Date(dateStr);
        if (!Number.isNaN(parsed.getTime())) {
            date = parsed;
        }
    }

    if (!date) {
        return String(dateStr);
    }

    return new Intl.DateTimeFormat(getPreferredLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};

export const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
};

export const getIncomeCategoryInfo = (categoryId) => {
    return INCOME_CATEGORIES.find(c => c.id === categoryId) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
};
