import pytest
import io
import pandas as pd
from app.services.csv_parser import parse_spreadsheet_statement

def test_csv_with_deep_preamble_metadata():
    csv_text = """HDFC BANK STATEMENT OF ACCOUNT
Account Number: 50100234567890
Customer Name: Rahul Sharma
IFSC Code: HDFC0001234
Branch: Koramangala Bangalore
Address: 123 4th Cross 5th Block
Opening Balance: INR 45,000.00
Statement Period: 01-Mar-2026 to 31-Mar-2026
Generated On: 31-Mar-2026 18:30:00
Page 1 of 1
Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/03/2026,Salary Credit Tech Solutions,REF12345,01/03/2026,,95000.00,140000.00
03/03/2026,House Rent Payment Landlord,REF12346,03/03/2026,25000.00,,115000.00
05/03/2026,Swiggy Bangalore Order,REF12347,05/03/2026,450.00,,114550.00
10/03/2026,Netflix Mumbai Subscription,REF12348,10/03/2026,649.00,,113901.00
15/03/2026,Blinkit Instant Groceries,REF12349,15/03/2026,1280.00,,112621.00
*** End of Statement ***
Total Withdrawals: 27,379.00
Total Deposits: 95,000.00"""
    csv_bytes = csv_text.strip().encode('utf-8')

    res = parse_spreadsheet_statement(csv_bytes, filename="hdfc_statement.csv")
    assert res["total_found"] == 5
    assert res["confidence_score"] == 1.0
    txs = res["transactions"]
    assert txs[0]["amount"] == 95000.0
    assert txs[0]["transaction_type"] == "income"
    assert txs[0]["category"] == "Salary"
    assert txs[1]["amount"] == 25000.0
    assert txs[1]["transaction_type"] == "expense"
    assert txs[1]["category"] == "Housing"
    assert txs[2]["merchant"] == "Swiggy"
    assert txs[3]["merchant"] == "Netflix"

def test_xlsx_excel_bank_statement():
    meta_rows = [
        ["STATE BANK OF INDIA - ACCOUNT STATEMENT"],
        ["Account Name", "Priya Verma"],
        ["Account Number", "30192837461"],
        ["Branch", "Indiranagar"],
        ["CIF No", "8723619283"],
        ["IFS Code", "SBIN0001234"],
        ["MICR Code", "560002012"],
        ["Nomination", "Registered"],
        ["Currency", "INR"],
        ["Opening Balance", "25000.00"],
        ["Period", "01-Mar-2026 to 15-Mar-2026"],
        [""]
    ]
    table_rows = [
        ["Txn Date", "Value Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"],
        ["01-03-2026", "01-03-2026", "SALARY CREDIT INFOTECH", "SBIR001", None, 80000.0, 105000.0],
        ["04-03-2026", "04-03-2026", "BESCOM ELECTRICITY BILL", "SBIR002", 2100.0, None, 102900.0],
        ["08-03-2026", "08-03-2026", "AMAZON ONLINE SHOPPING", "SBIR003", 3499.0, None, 99401.0],
        ["12-03-2026", "12-03-2026", "ZERODHA BROKING FUND ADD", "SBIR004", 10000.0, None, 89401.0]
    ]
    all_data = meta_rows + table_rows
    df = pd.DataFrame(all_data)
    out = io.BytesIO()
    df.to_excel(out, index=False, header=False)
    excel_bytes = out.getvalue()

    res = parse_spreadsheet_statement(excel_bytes, filename="sbi_statement.xlsx")
    assert res["total_found"] == 4
    txs = res["transactions"]
    assert txs[0]["amount"] == 80000.0
    assert txs[0]["transaction_type"] == "income"
    assert txs[1]["amount"] == 2100.0
    assert txs[1]["category"] == "Utilities"
    assert txs[2]["merchant"] == "Amazon"
    assert txs[3]["category"] == "Investments"