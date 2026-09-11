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
    "posting date", "transaction_date", "trans date", "date time", "tran date",
    "txndate", "booking date", "dt"
]

DESC_HEADERS = [
    "description", "narration", "particulars", "details", "remarks",
    "transaction details", "payee", "memo", "narrative", "party",
    "transaction remarks", "txn description", "statement description",
    "tran details", "trans details"
]

DEBIT_HEADERS = [
    "debit", "withdrawal", "dr", "dr amount", "debit amount", "outflow",
    "paid out", "withdrawal amt", "withdrawal amount", "debit (dr)", "withdrawal (dr)",
    "debit inr", "withdrawal inr", "withdrawal amount (inr )", "dr."
]

CREDIT_HEADERS = [
    "credit", "deposit", "cr", "cr amount", "credit amount", "inflow",
    "paid in", "deposit amt", "deposit amount", "credit (cr)", "deposit (cr)",
    "credit inr", "deposit inr", "deposit amount (inr )", "cr."
]

AMOUNT_HEADERS = [
    "amount", "txn amount", "transaction amount", "net amount", "total",
    "amount inr", "transaction amount inr", "total amount", "amount (inr)"
]

TYPE_HEADERS = [
    "type", "transaction type", "cr/dr", "cr_dr", "d/c", "txn type",
    "credit/debit", "dr/cr"
]

SUMMARY_KEYWORDS = [
    "total", "closing balance", "opening balance", "balance brought forward",
    "b/f", "c/f", "statement summary", "*** end", "page ", "disclaimer",
    "generated on", "computer generated", "transactions total"
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
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.strftime("%Y-%m-%d")

    s = str(val).strip()
    if not s or s.lower() in ("nan", "null", "none", "nat"):
        return None

    # Already YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s

    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y",
        "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d %B %Y",
        "%d-%b-%Y", "%d-%b-%y", "%d-%B-%Y",
        "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
            
    # Fallback with pandas to_datetime
    try:
        dt = pd.to_datetime(s, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def parse_amount_num(val: Any) -> float:
    """Parses clean numeric float from currency string, removing commas, symbols, spaces, and Dr/Cr notations."""
    if pd.isna(val) or val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return abs(float(val))

    s = str(val).strip()
    if not s or s.lower() in ("nan", "null", "none", "-"):
        return 0.0

    # Remove currency symbols (₹, $, €, £), Dr, Cr suffixes, commas, quotes, parentheses
    cleaned = re.sub(r'[₹$€£,\s"\'\(\)]', '', s, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:cr|dr)$', '', cleaned, flags=re.IGNORECASE).strip()
    try:
        return abs(float(cleaned))
    except ValueError:
        return 0.0

def is_summary_or_footer_row(desc: str) -> bool:
    """Detects if row is a bank statement footer, total, or disclaimer."""
    d_lower = str(desc).lower().strip()
    return any(kw in d_lower for kw in SUMMARY_KEYWORDS)

def parse_spreadsheet_statement(
    file_content: bytes,
    filename: str = "statement.csv",
    existing_transactions: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Universal spreadsheet statement parser (CSV, XLSX, XLS).
    - Skips initial 10-30 metadata rows dynamically.
    - Matches bank column headers for all major retail & commercial banks.
    - Strips summary and disclaimer footers.
    - Normalizes dates and amounts.
    - Auto-categorizes transactions and detects duplicates.
    """
    existing_transactions = existing_transactions or []
    
    # Build duplicate lookup keys: (date, round(amount, 2), desc_prefix, type)
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

    is_excel = filename.lower().endswith((".xlsx", ".xls"))
    df_raw = None
    lines = []

    if is_excel:
        try:
            df_raw = pd.read_excel(io.BytesIO(file_content), header=None, nrows=150)
        except Exception as e:
            raise ValueError(f"Failed to read Excel workbook: {str(e)}")
    else:
        text = ""
        for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"]:
            try:
                text = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if not text:
            raise ValueError("Could not decode CSV file. Ensure it is encoded in standard UTF-8 or Latin.")

        lines = text.splitlines()
        raw_rows = []
        for line in lines[:150]:
            try:
                reader = csv.reader([line])
                for row in reader:
                    if row:
                        raw_rows.append(row)
            except Exception:
                raw_rows.append(line.split(","))

        if raw_rows:
            max_cols = max(len(r) for r in raw_rows)
            padded = [r + [""] * (max_cols - len(r)) for r in raw_rows]
            df_raw = pd.DataFrame(padded)

    if df_raw is None or df_raw.empty:
        raise ValueError("The uploaded statement contains no data rows.")

    # -------------------------------------------------------------
    # Deep Preamble Scanner: check first 60 rows for table header
    # -------------------------------------------------------------
    header_idx = -1
    best_match_score = 0

    for r_idx in range(min(60, len(df_raw))):
        row_values = [str(x).strip() for x in df_raw.iloc[r_idx] if pd.notna(x) and str(x).strip()]
        if not row_values:
            continue

        d_col = find_best_matching_column(row_values, DATE_HEADERS)
        desc_col = find_best_matching_column(row_values, DESC_HEADERS)
        dr_col = find_best_matching_column(row_values, DEBIT_HEADERS)
        cr_col = find_best_matching_column(row_values, CREDIT_HEADERS)
        amt_col = find_best_matching_column(row_values, AMOUNT_HEADERS)

        score = 0
        if d_col: score += 3
        if desc_col: score += 3
        if dr_col or cr_col or amt_col: score += 3

        if score > best_match_score and score >= 6:
            best_match_score = score
            header_idx = r_idx
            if score >= 9:
                break

    if header_idx == -1:
        header_idx = 0

    if is_excel:
        try:
            df = pd.read_excel(io.BytesIO(file_content), skiprows=header_idx)
        except Exception:
            df = df_raw.iloc[header_idx + 1:].copy()
            df.columns = [str(c).strip() for c in df_raw.iloc[header_idx]]
    else:
        csv_data = "\n".join(lines[header_idx:])
        try:
            df = pd.read_csv(io.StringIO(csv_data), skipinitialspace=True, on_bad_lines="skip")
        except Exception as e:
            raise ValueError(f"Failed to parse CSV format: {str(e)}")

    if df.empty:
        raise ValueError("No transaction records found after statement preamble.")

    df.columns = [str(c).strip() for c in df.columns]
    cols = list(df.columns)

    date_col = find_best_matching_column(cols, DATE_HEADERS)
    desc_col = find_best_matching_column(cols, DESC_HEADERS)
    debit_col = find_best_matching_column(cols, DEBIT_HEADERS)
    credit_col = find_best_matching_column(cols, CREDIT_HEADERS)
    amount_col = find_best_matching_column(cols, AMOUNT_HEADERS)
    type_col = find_best_matching_column(cols, TYPE_HEADERS)

    if not date_col:
        raise ValueError(f"Could not identify 'Date' column in statement. Found: {', '.join(cols[:8])}.")
    if not desc_col:
        for c in cols:
            if c not in (date_col, debit_col, credit_col, amount_col, type_col):
                desc_col = c
                break

    if not (debit_col or credit_col or amount_col):
        raise ValueError(f"Could not identify transaction amount columns (Debit, Credit, or Amount). Found: {', '.join(cols[:8])}.")

    parsed_transactions = []
    total_found = 0
    duplicate_count = 0

    for idx, row in df.iterrows():
        raw_date = row.get(date_col)
        iso_date = parse_date_str(raw_date)
        if not iso_date:
            continue

        raw_desc = str(row.get(desc_col, "")).strip() if desc_col else ""
        if not raw_desc or raw_desc.lower() in ("nan", "null", "none", "-"):
            continue

        if is_summary_or_footer_row(raw_desc):
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

            raw_str = str(raw_amt_val).strip().lower()
            if "-" in raw_str or "dr" in raw_str:
                t_type = "expense"
            elif "cr" in raw_str:
                t_type = "income"
            elif type_col:
                type_val = str(row.get(type_col, "")).strip().lower()
                if type_val in ("cr", "credit", "deposit", "inflow"):
                    t_type = "income"
                else:
                    t_type = "expense"
            else:
                t_type = "expense"

        category, subcategory, merchant = categorize_transaction(raw_desc, amount, t_type)

        tx_key = make_dup_key(iso_date, amount, raw_desc, t_type)
        is_dup = tx_key in existing_keys
        dup_reason = "Identical transaction already on record" if is_dup else None

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
        "confidence_score": 1.0 if total_found > 0 else 0.0,
        "parsing_notes": f"Successfully parsed {total_found} rows from {filename} (skipped preamble rows 1–{header_idx}). Mapped: Date='{date_col}', Narration='{desc_col}'.",
        "transactions": parsed_transactions
    }

def parse_csv_statement(
    file_content: bytes,
    existing_transactions: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    return parse_spreadsheet_statement(file_content, "statement.csv", existing_transactions)
