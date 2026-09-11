import pytest
from app.services.categorization_service import categorize_transaction, extract_merchant

def test_merchant_extraction():
    assert extract_merchant("UPI/ZOMATO/ORDER123/BANGALORE") == "Zomato"
    assert extract_merchant("SWIGGY INSTAMART ORDER #99281") in ("Swiggy", "Instamart")
    assert extract_merchant("UBER INDIA RIDES PVT LTD") == "Uber"
    assert extract_merchant("AMAZON PAY INDIA") == "Amazon"
    assert extract_merchant("NETFLIX ENTERTAINMENT SVCS") == "Netflix"

def test_categorization_rules():
    # Food
    cat, subcat, _ = categorize_transaction("ZOMATO ORDER #58129")
    assert cat == "Food"

    # Groceries
    cat, subcat, _ = categorize_transaction("BLINKIT GROCERY DELIVERY")
    assert cat == "Groceries"

    # Transport
    cat, subcat, _ = categorize_transaction("UBER TRIP BANGALORE")
    assert cat == "Transport"

    # Subscriptions
    cat, subcat, _ = categorize_transaction("SPOTIFY MONTHLY SUBSCRIPTION")
    assert cat == "Subscriptions"

    # Utilities
    cat, subcat, _ = categorize_transaction("BESCOM ELECTRICITY BILL PAYMENT")
    assert cat == "Utilities"

    # Housing
    cat, subcat, _ = categorize_transaction("FLAT RENT TO LANDLORD")
    assert cat == "Housing"

    # Salary
    cat, subcat, _ = categorize_transaction("MONTHLY SALARY CREDIT TECH CORP", transaction_type="income")
    assert cat == "Salary"

    # Investments
    cat, subcat, _ = categorize_transaction("ZERODHA BROKING LTD SIP")
    assert cat == "Investments"
