import io
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from pypdf import PdfReader
from app.services.categorization_service import categorize_transaction
from app.services.csv_parser import parse_date_str, parse_amount_num

DATE_REGEX = re.compile(
    r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b',
    re.IGNORECASE
)

# Matches amounts like 1,250.00 or 450.50 or 80000.00
AMOUNT_REGEX = re.compile(r'\b(?:\d{1,3}(?:,\d{2,3})*|\d+)\.\d{2}\b')

def parse_pdf_statement(
    file_content: bytes,
    existing_transactions: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Best-effort PDF bank statement parser.
    Extracts transactions deterministically without hallucination.
    If the document format is unparseable or ambiguous, returns low confidence
    and explicitly guides the user to CSV or manual entry.
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

    try:
        reader = PdfReader(io.BytesIO(file_content))
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
