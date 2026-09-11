import pytest
from app.services.csv_parser import parse_csv_statement

def test_csv_parsing_and_duplicate_detection():
    sample_csv = """Transaction Date,Narration,Debit,Credit,Balance
01/08/2026,UPI-ZOMATO-123456,450.00,,9550.00
05/08/2026,SALARY CREDIT TECHCORP,,85000.00,94550.00
10/08/2026,SWIGGY INSTAMART,1200.00,,93350.00
15/08/2026,UBER TRIP BANGALORE,350.00,,93000.00
"""
    existing_transactions = [
        {"date": "2026-08-01", "description": "UPI-ZOMATO-123456", "amount": 450.0, "transaction_type": "expense"}
    ]

    result = parse_csv_statement(sample_csv.encode("utf-8"), existing_transactions=existing_transactions)

    assert result["total_found"] == 4
    # 1 duplicate detected
    assert result["duplicate_transactions"] == 1
    assert result["new_transactions"] == 3

    txs = result["transactions"]
    assert txs[0]["is_duplicate"] is True
    assert txs[0]["category"] == "Food"

    assert txs[1]["transaction_type"] == "income"
    assert txs[1]["category"] == "Salary"
    assert txs[1]["amount"] == 85000.0

    assert txs[2]["category"] == "Groceries"
    assert txs[3]["category"] == "Transport"
