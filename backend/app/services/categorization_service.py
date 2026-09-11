import re
from typing import Tuple, Optional

# Merchant keywords mapped to (Category, Subcategory, CleanMerchantName)
CATEGORY_RULES = {
    # Groceries (checked before generic food for quick-commerce like Instamart/Blinkit)
    r"(?i)\b(blinkit|zepto|instamart|bigbasket|nature'?s basket|d-?mart|spencer|supermarket|hypermarket|grocer(y|ies)|kirana|milk|dairy|more retail|reliance fresh|vegetable|fruit)\b": (
        "Groceries", "Essentials"
    ),
    # Food & Dining
    r"(?i)\b(zomato|swiggy|mcdonald|starbucks|domino|pizza|kfc|burger king|haldiram|subway|cafe coffee day|chaayos|chai point|dindigul|biryani|barbeque nation|rest(aurant)?|baker(y)?|sweet(s)?|food|eats|kitchen|canteen)\b": (
        "Food", "Dining & Takeout"
    ),
    # Shopping
    r"(?i)\b(amazon|flipkart|myntra|ajio|nykaa|zara|h&m|uniqlo|croma|reliance digital|apple store|ikea|decathlon|tata cliq|lenskart|shopping|retail|cloth(es|ing)|fashion)\b": (
        "Shopping", "Retail & Lifestyle"
    ),
    # Transport
    r"(?i)\b(uber|ola|rapido|metro|irctc|indian rail|fuel|petrol|diesel|hpcl|bpcl|iocl|shell|fastag|toll|parking|auto|cab|taxi|train|flight|commute)\b": (
        "Transport", "Commute & Fuel"
    ),
    # Housing & Rent
    r"(?i)\b(rent|landlord|maintenance|society|housing|apartment|brokerage|pg accommodation|flat rent)\b": (
        "Housing", "Rent & Maintenance"
    ),
    # Utilities
    r"(?i)\b(electricity|bescom|adani electricity|water board|gas bill|igl|mahanagar gas|indane|cylinder|broadband|act fibernet|airtel|jio|vi prepaid|vi postpaid|vodafone|tatasky|tata play|recharge|dth)\b": (
        "Utilities", "Bills & Connectivity"
    ),
    # Subscriptions
    r"(?i)\b(netflix|spotify|amazon prime|hotstar|disney\+?|youtube prem|apple music|chatgpt|openai|github|notion|icloud|google one|playstation plus|xbox game pass|audible|medium)\b": (
        "Subscriptions", "Digital Subscriptions"
    ),
    # Health & Medical
    r"(?i)\b(apollo|pharmeasy|1mg|practo|netmeds|hospital|clinic|pharmacy|chemist|med(s|icine)?|doctor|dental|lab|diagnostic|gym|cult\.fit|cult fitness|wellness)\b": (
        "Health", "Medical & Fitness"
    ),
    # Entertainment
    r"(?i)\b(bookmyshow|pvr|inox|cinepolis|movie|cinema|steam|gaming|concert|event|theatre|amusement)\b": (
        "Entertainment", "Movies & Leisure"
    ),
    # Travel
    r"(?i)\b(makemytrip|cleartrip|yatra|goibibo|indigo|air india|vistara|spicejet|airasia|hotel|airbnb|booking\.com|agoda|resort|vacation|tourism)\b": (
        "Travel", "Flights & Hotels"
    ),
    # Salary & Income
    r"(?i)\b(salary|payroll|stipend|wages|employer|bonus|dividend|interest credit|incentive|freelance|consulting fee)\b": (
        "Salary", "Employment Income"
    ),
    # Investments
    r"(?i)\b(zerodha|groww|upstox|angel one|coin|kuvera|cams|karvy|mutual fund|sip|securities|stock|ppf|nps|fixed deposit|recurring deposit|fd|rd|crypto|binance|coinbase)\b": (
        "Investments", "Equities & Deposits"
    ),
    # Fees & Charges
    r"(?i)\b(bank charge|atm fee|interest debit|penalty|fine|annual fee|card fee|forex markup|service charge|overdraft)\b": (
        "Fees", "Bank Charges"
    ),
    # Transfers
    r"(?i)\b(self transfer|transfer to self|neft to self|imps to self|own account|sweep in|sweep out)\b": (
        "Transfers", "Internal Transfer"
    )
}

KNOWN_MERCHANTS = [
    "Zomato", "Swiggy", "Blinkit", "Zepto", "Instamart", "BigBasket", "Amazon",
    "Flipkart", "Myntra", "Uber", "Ola", "Rapido", "Netflix", "Spotify",
    "Hotstar", "Airtel", "Jio", "Bescom", "Cult.fit", "PVR", "MakeMyTrip",
    "Zerodha", "Groww", "Apollo", "PharmEasy", "Tata Play", "Apple", "Google"
]

def extract_merchant(description: str) -> Optional[str]:
    """Attempts to extract a clean merchant name from raw narration."""
    desc_clean = description.strip()
    for merchant in KNOWN_MERCHANTS:
        if re.search(r'\b' + re.escape(merchant) + r'\b', desc_clean, re.IGNORECASE):
            return merchant
    
    # Try generic clean-up for UPI narrations like "UPI/ZOMATO/1234/..."
    upi_match = re.search(r'UPI/(?:[A-Z0-9_\-\.]+)/([A-Za-z0-9 ]+)', desc_clean)
    if upi_match:
        m = upi_match.group(1).strip()
        if len(m) >= 3 and not m.isdigit():
            return m.title()
            
    return None

def categorize_transaction(description: str, amount: float = 0.0, transaction_type: str = "expense") -> Tuple[str, Optional[str], Optional[str]]:
    """
    Deterministically assigns (category, subcategory, merchant) based on transaction description.
    Never relies on external AI arithmetic or non-deterministic inference.
    """
    if not description:
        return "Other", None, None
        
    merchant = extract_merchant(description)

    # If transaction type is income and contains salary keywords
    if transaction_type == "income":
        for pattern, (cat, subcat) in CATEGORY_RULES.items():
            if cat in ("Salary", "Investments") and re.search(pattern, description):
                return cat, subcat, merchant
        return "Income", "General Income", merchant

    # Match expense rules
    for pattern, (cat, subcat) in CATEGORY_RULES.items():
        if re.search(pattern, description):
            return cat, subcat, merchant

    # Default fallback
    return "Other", "Uncategorized", merchant
