import io
import re
import csv
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from app.services.categorization_service import categorize_transaction

# Flexible Header Variations
DATE_HEADERS = [
    "date", "transaction date", "txn date", "value date", "post date",
    "posting date", "transaction_date", "trans date", "date time"
]

DESC_HEADERS = [
    "description", "narration", "particulars", "details", "remarks",
    "transaction details", "payee", "memo", "narrative", "party"
]

DEBIT_HEADERS = [
    "debit", "withdrawal", "dr", "dr amount", "debit amount", "outflow", "paid out"
]

CREDIT_HEADERS = [
    "credit", "deposit", "cr", "cr amount", "credit amount", "inflow", "paid in"
]

AMOUNT_HEADERS = [
    "amount", "txn amount", "transaction amount", "net amount", "total"
]

TYPE_HEADERS = [
    "type", "transaction type", "cr/dr", "cr_dr", "d/c", "txn type"
]

def clean_col_name(name: str) -> str:
    """Normalizes column header for matching."""
    return re.sub(r'[^a-z0-9]', ' ', str(name).lower()).strip()

def find_best_matching_column(columns: List[str], candidates: List[str]) -> Optional[str]:
    """Finds the best matching column name from candidates."""
    cleaned_map = {clean_col_name(c): c for c in columns}
    
    # Exact cleaned match
    for cand in candidates:
        if cand in cleaned_map:
            return cleaned_map[cand]
            
    # Substring match
    for cand in candidates:
        for cleaned_col, orig_col in cleaned_map.items():
            if cand in cleaned_col:
                return orig_col
                
    return None

def parse_date_str(val: Any) -> Optional[str]:
    """Tries multiple date formats and returns ISO YYYY-MM-DD format."""
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if not s:
        return None

    # Already YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s

    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y",
        "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d %B %Y",
        "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
            
    # Fallback with dateutil / pandas
    try:
        dt = pd.to_datetime(s, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def parse_amount_num(val: Any) -> float:
    """Parses clean numeric float from currency string, removing commas, symbols, spaces."""
    if pd.isna(val) or val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    # Remove currency symbols (₹, $, €, £), commas, quotes
    cleaned = re.sub(r'[₹$€£,\s"\'\(\)]', '', s)
    try:
        return abs(float(cleaned))
    except ValueError:
        return 0.0

def parse_csv_statement(
    file_content: bytes,
    existing_transactions: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Parses bank/account statement CSV into normalized transactions.
    Detects headers, normalizes amounts and dates, auto-categorizes, and flags duplicates.
    """
    existing_transactions = existing_transactions or []
    
    # Build duplicate lookup keys from existing records: (date, round(amount, 2), desc_key, type)
    def make_dup_key(d: str, amt: float, desc: str, t_type: str) -> str:
        d_clean = (desc or "").strip().lower()[:25]
        return f"{d}_{round(float(amt), 2)}_{d_clean}_{t_type}"

    existing_keys = set()
    for tx in existing_transactions:
        k = make_dup_key(
            str(tx.get("date", "")),
            float(tx.get("amount", 0.0)),
            str(tx.get("description", "")),
            str(tx.get("transaction_type", "expense"))
        )
        existing_keys.add(k)

    # Decode bytes to text
    text = ""
    for encoding in ["utf-8", "latin-1", "iso-8859-1", "cp1252"]:
        try:
            text = file_content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if not text:
        raise ValueError("Could not decode CSV file. Ensure it is encoded in UTF-8 or standard Latin.")

    # Detect header row in case bank statements have preamble lines
    lines = text.splitlines()
    header_idx = 0
    for idx, line in enumerate(lines[:20]):
        lower_line = line.lower()
        # Look for at least date and (amount or debit/credit or narration/description)
        has_date = any(h in lower_line for h in ["date"])
        has_amt = any(h in lower_line for h in ["amount", "debit", "withdrawal", "deposit", "credit", "balance", "particulars", "narration"])
        if has_date and has_amt:
            header_idx = idx
            break

    csv_data = "\n".join(lines[header_idx:])
    try:
        df = pd.read_csv(io.StringIO(csv_data), skipinitialspace=True)
    except Exception as e:
        raise ValueError(f"Failed to parse CSV format: {str(e)}")

    if df.empty:
        raise ValueError("The provided CSV file contains no data rows.")

    cols = list(df.columns)
    date_col = find_best_matching_column(cols, DATE_HEADERS)
    desc_col = find_best_matching_column(cols, DESC_HEADERS)
    debit_col = find_best_matching_column(cols, DEBIT_HEADERS)
    credit_col = find_best_matching_column(cols, CREDIT_HEADERS)
    amount_col = find_best_matching_column(cols, AMOUNT_HEADERS)
    type_col = find_best_matching_column(cols, TYPE_HEADERS)

    if not date_col or not desc_col:
        raise ValueError(
            f"Could not identify required 'Date' and 'Description/Narration' columns. "
            f"Found columns: {', '.join(cols[:8])}."
        )

    if not (debit_col or credit_col or amount_col):
        raise ValueError(
            f"Could not identify transaction amount columns (Debit, Credit, or Amount). "
            f"Found columns: {', '.join(cols[:8])}."
        )

    parsed_transactions = []
    total_found = 0
    duplicate_count = 0

    for idx, row in df.iterrows():
        raw_date = row.get(date_col)
        iso_date = parse_date_str(raw_date)
        if not iso_date:
            continue

        raw_desc = str(row.get(desc_col, "")).strip()
        if not raw_desc or raw_desc.lower() in ("nan", "null", "none"):
            continue

        amount = 0.0
        t_type = "expense"

        if debit_col and credit_col:
            debit_val = parse_amount_num(row.get(debit_col))
            credit_val = parse_amount_num(row.get(credit_col))
            if debit_val > 0:
                amount = debit_val
                t_type = "expense"
            elif credit_val > 0:
                amount = credit_val
                t_type = "income"
            else:
                continue
        elif amount_col:
            raw_amt_val = row.get(amount_col)
            amount = parse_amount_num(raw_amt_val)
            if amount == 0.0:
                continue

            # Check if negative
            raw_str = str(raw_amt_val).strip()
            if "-" in raw_str:
                t_type = "expense"
            elif type_col and str(row.get(type_col, "")).strip().lower() in ("cr", "credit", "deposit", "inflow"):
                t_type = "income"
            elif type_col and str(row.get(type_col, "")).strip().lower() in ("dr", "debit", "withdrawal", "outflow"):
                t_type = "expense"
            else:
                t_type = "expense"

        # Categorize
        category, subcategory, merchant = categorize_transaction(raw_desc, amount, t_type)

        # Check duplicate
        tx_key = make_dup_key(iso_date, amount, raw_desc, t_type)
        is_dup = tx_key in existing_keys
        dup_reason = "Identical date, amount, and description already exists" if is_dup else None

        if is_dup:
            duplicate_count += 1

        parsed_transactions.append({
            "id": f"preview_{idx}",
            "date": iso_date,
            "description": raw_desc,
            "amount": round(amount, 2),
            "transaction_type": t_type,
            "category": category,
            "merchant": merchant,
            "is_duplicate": is_dup,
            "duplicate_reason": dup_reason
        })
        total_found += 1

    return {
        "total_found": total_found,
        "new_transactions": total_found - duplicate_count,
        "duplicate_transactions": duplicate_count,
        "confidence_score": 1.0,
        "parsing_notes": f"Successfully parsed {total_found} rows using mapped columns: Date='{date_col}', Desc='{desc_col}'.",
        "transactions": parsed_transactions
    }
