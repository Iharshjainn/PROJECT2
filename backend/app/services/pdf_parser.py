import io
import re
import pdfplumber
from typing import List, Dict, Any, Optional
from datetime import datetime
from pypdf import PdfReader
from app.services.categorization_service import categorize_transaction
from app.services.csv_parser import (
    parse_date_str,
    parse_amount_num,
    is_summary_or_footer_row,
    find_best_matching_column,
    DATE_HEADERS,
    DESC_HEADERS,
    DEBIT_HEADERS,
    CREDIT_HEADERS,
    AMOUNT_HEADERS,
    TYPE_HEADERS
)

DATE_REGEX = re.compile(
    r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b',
    re.IGNORECASE
)

# Matches amounts like 1,250.00 or 450.50 or 80000.00
AMOUNT_REGEX = re.compile(r'\b(?:\d{1,3}(?:,\d{2,3})*|\d+)\.\d{2}\b')

def parse_pdf_statement(
    file_content: bytes,
    existing_transactions: Optional[List[Dict[str, Any]]] = None,
    password: Optional[str] = None
) -> Dict[str, Any]:
    """
    High-fidelity PDF bank statement parser.
    Uses pdfplumber to extract table grids, skipping metadata preamble rows (1-30).
    Falls back to line regex if tables are unstructured.
    Supports password-protected PDFs.
    """
    existing_transactions = existing_transactions or []
    
    # Existing duplicates lookup
    def make_dup_key(d: str, amt: float, desc: str, t_type: str) -> str:
        d_clean = (desc or "").strip().lower()[:25]
        return f"{d}_{round(float(amt), 2)}_{d_clean}_{t_type}"

    existing_keys = {
        make_dup_key(
            str(tx.get("date", "")),
            float(tx.get("amount", 0.0)),
            str(tx.get("description", "")),
            str(tx.get("transaction_type", "expense"))
        )
        for tx in existing_transactions
    }

    parsed_transactions = []
    duplicate_count = 0
    total_found = 0

    # 1. High-fidelity Table Extraction via pdfplumber
    try:
        with pdfplumber.open(io.BytesIO(file_content), password=password or "") as pdf:
            for p_idx, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if not tables:
                    continue
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Search first 25 rows of table for header row (skips bank metadata)
                    t_header_idx = -1
                    date_col_idx = -1
                    desc_col_idx = -1
                    debit_col_idx = -1
                    credit_col_idx = -1
                    amt_col_idx = -1

                    for r_idx, row in enumerate(table[:25]):
                        if not row:
                            continue
                        row_strs = [str(cell or "").strip() for cell in row]
                        d_col = find_best_matching_column(row_strs, DATE_HEADERS)
                        des_col = find_best_matching_column(row_strs, DESC_HEADERS)
                        deb_col = find_best_matching_column(row_strs, DEBIT_HEADERS)
                        cre_col = find_best_matching_column(row_strs, CREDIT_HEADERS)
                        am_col = find_best_matching_column(row_strs, AMOUNT_HEADERS)

                        if d_col and (deb_col or cre_col or am_col):
                            t_header_idx = r_idx
                            for c_i, c_val in enumerate(row_strs):
                                if c_val == d_col: date_col_idx = c_i
                                if c_val == des_col: desc_col_idx = c_i
                                if c_val == deb_col: debit_col_idx = c_i
                                if c_val == cre_col: credit_col_idx = c_i
                                if c_val == am_col: amt_col_idx = c_i
                            break

                    if t_header_idx != -1 and date_col_idx != -1:
                        for row in table[t_header_idx + 1:]:
                            if not row or len(row) <= date_col_idx:
                                continue
                            raw_date = row[date_col_idx]
                            iso_date = parse_date_str(raw_date)
                            if not iso_date:
                                continue

                            raw_desc = ""
                            if desc_col_idx != -1 and len(row) > desc_col_idx and row[desc_col_idx]:
                                raw_desc = str(row[desc_col_idx]).strip().replace("\n", " ")
                            else:
                                for ci, cell in enumerate(row):
                                    if ci not in (date_col_idx, debit_col_idx, credit_col_idx, amt_col_idx) and cell:
                                        raw_desc = str(cell).strip().replace("\n", " ")
                                        break

                            if not raw_desc or is_summary_or_footer_row(raw_desc):
                                continue

                            t_type = "expense"
                            amount = 0.0

                            if debit_col_idx != -1 and credit_col_idx != -1:
                                deb_val = parse_amount_num(row[debit_col_idx]) if len(row) > debit_col_idx else 0.0
                                cre_val = parse_amount_num(row[credit_col_idx]) if len(row) > credit_col_idx else 0.0
                                if deb_val > 0:
                                    amount = deb_val
                                    t_type = "expense"
                                elif cre_val > 0:
                                    amount = cre_val
                                    t_type = "income"
                                else:
                                    continue
                            elif amt_col_idx != -1 and len(row) > amt_col_idx:
                                raw_amt = str(row[amt_col_idx] or "")
                                amount = parse_amount_num(raw_amt)
                                if amount <= 0:
                                    continue
                                if "cr" in raw_amt.lower() or "+" in raw_amt:
                                    t_type = "income"
                                else:
                                    t_type = "expense"
                            else:
                                continue

                            category, subcategory, merchant = categorize_transaction(raw_desc, amount, t_type)
                            tx_key = make_dup_key(iso_date, amount, raw_desc, t_type)
                            is_dup = tx_key in existing_keys
                            if is_dup:
                                duplicate_count += 1

                            parsed_transactions.append({
                                "id": f"pdf_tbl_{len(parsed_transactions)}",
                                "date": iso_date,
                                "description": raw_desc,
                                "amount": round(amount, 2),
                                "transaction_type": t_type,
                                "category": category,
                                "merchant": merchant,
                                "is_duplicate": is_dup,
                                "duplicate_reason": "Identical transaction already on record" if is_dup else None
                            })
                            total_found += 1
    except Exception as e:
        err_msg = str(e).lower()
        if "password" in err_msg or "encrypt" in err_msg:
            return {
                "total_found": 0,
                "new_transactions": 0,
                "duplicate_transactions": 0,
                "confidence_score": 0.0,
                "is_encrypted": True,
                "parsing_notes": "This bank statement PDF is password-protected. Please provide the document password to open it.",
                "transactions": []
            }

    if total_found > 0:
        return {
            "total_found": total_found,
            "new_transactions": total_found - duplicate_count,
            "duplicate_transactions": duplicate_count,
            "confidence_score": 0.98,
            "parsing_notes": f"Successfully parsed {total_found} transactions from PDF table grid structure.",
            "transactions": parsed_transactions
        }

    # 2. Fallback: Plain Text Extraction via pypdf
    try:
        reader = PdfReader(io.BytesIO(file_content))
        if reader.is_encrypted and password:
            reader.decrypt(password)
    except Exception as e:
        return {
            "total_found": 0,
            "new_transactions": 0,
            "duplicate_transactions": 0,
            "confidence_score": 0.0,
            "parsing_notes": f"Unable to read PDF structure: {str(e)}. Please check if the file is encrypted or corrupted.",
            "transactions": []
        }

    extracted_lines = []
    for page in reader.pages:
        try:
            page_text = page.extract_text()
            if page_text:
                for line in page_text.splitlines():
                    cleaned = line.strip()
                    if cleaned:
                        extracted_lines.append(cleaned)
        except Exception:
            continue

    if not extracted_lines:
        return {
            "total_found": 0,
            "new_transactions": 0,
            "duplicate_transactions": 0,
            "confidence_score": 0.0,
            "parsing_notes": (
                "The PDF could not be parsed because no digital text could be extracted. "
                "The statement might be a scanned image or protected. "
                "For guaranteed accuracy, please download a CSV statement from your bank portal or enter transactions manually."
            ),
            "transactions": []
        }

    parsed_transactions = []
    duplicate_count = 0
    candidate_lines_count = 0

    for idx, line in enumerate(extracted_lines):
        # Look for date occurrence
        date_match = DATE_REGEX.search(line)
        if not date_match:
            continue

        raw_date = date_match.group(1)
        iso_date = parse_date_str(raw_date)
        if not iso_date:
            continue

        candidate_lines_count += 1

        # Look for amounts in the line
        amounts = AMOUNT_REGEX.findall(line)
        if not amounts:
            continue

        # In typical bank statements with (Date, Description, Debit, Credit, Balance):
        # The line might have 1, 2, or 3 amounts.
        # If multiple amounts, check line keywords for Cr / Dr or withdrawal / deposit
        lower_line = line.lower()
        t_type = "expense"

        if "cr" in lower_line or "credit" in lower_line or "deposit" in lower_line or "salary" in lower_line:
            t_type = "income"
            amount = parse_amount_num(amounts[0])
        elif "dr" in lower_line or "debit" in lower_line or "withdrawal" in lower_line:
            t_type = "expense"
            amount = parse_amount_num(amounts[0])
        else:
            # First amount usually debit/credit
            amount = parse_amount_num(amounts[0])

        if amount <= 0.0:
            continue

        # Description is the remainder of line without date and amounts
        desc = line
        desc = desc.replace(raw_date, "")
        for amt_str in amounts:
            desc = desc.replace(amt_str, "")
        desc = re.sub(r'\b(CR|DR|Cr|Dr)\b', '', desc)
        desc = re.sub(r'[\t\s]+', ' ', desc).strip(' -/,:')

        if len(desc) < 3:
            desc = f"Transaction on {iso_date}"

        category, subcategory, merchant = categorize_transaction(desc, amount, t_type)

        tx_key = make_dup_key(iso_date, amount, desc, t_type)
        is_dup = tx_key in existing_keys
        if is_dup:
            duplicate_count += 1

        parsed_transactions.append({
            "id": f"pdf_preview_{idx}",
            "date": iso_date,
            "description": desc,
            "amount": round(amount, 2),
            "transaction_type": t_type,
            "category": category,
            "merchant": merchant,
            "is_duplicate": is_dup,
            "duplicate_reason": "Identical transaction already on record" if is_dup else None
        })

    total_found = len(parsed_transactions)

    if total_found == 0:
        return {
            "total_found": 0,
            "new_transactions": 0,
            "duplicate_transactions": 0,
            "confidence_score": 0.0,
            "parsing_notes": (
                "No standard transaction rows could be confidently recognized from this PDF. "
                "Bank statement layouts vary significantly across institutions. "
                "We recommend exporting a CSV statement from your online banking portal for seamless 100% accuracy, or entering transactions manually."
            ),
            "transactions": []
        }

    # Calculate confidence based on proportion of parsed candidates
    confidence = min(0.95, round(total_found / max(candidate_lines_count, 1), 2))
    notes = (
        f"Extracted {total_found} transactions from PDF with {confidence * 100:.0f}% structural confidence. "
        f"Please verify the preview below before confirming the import."
    )

    return {
        "total_found": total_found,
        "new_transactions": total_found - duplicate_count,
        "duplicate_transactions": duplicate_count,
        "confidence_score": confidence,
        "parsing_notes": notes,
        "transactions": parsed_transactions
    }
