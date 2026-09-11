from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import Dict, Any, List
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.csv_parser import parse_csv_statement
from app.services.pdf_parser import parse_pdf_statement
from app.schemas.analytics import StatementPreviewResponse, StatementConfirmRequest, StatementConfirmResponse

router = APIRouter(prefix="/statements", tags=["Statements"])

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB limit

@router.post("/csv-preview", response_model=StatementPreviewResponse)
async def preview_csv_statement(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Parses an uploaded CSV statement, auto-detects columns, normalizes schema,
    categorizes merchants, and identifies potential duplicates against existing records.
    Always provides a preview before any changes are committed.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .csv file.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 10MB size limit.")

    db = DataService(user.id)
    existing_txs = await db.get_transactions(limit=1000)

    try:
        preview = parse_csv_statement(content, existing_transactions=existing_txs)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV statement: {str(e)}")

@router.post("/pdf-preview", response_model=StatementPreviewResponse)
async def preview_pdf_statement(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Best-effort PDF bank statement parsing.
    Safely extracts transactions without hallucinating data.
    If the layout cannot be confidently parsed, returns a low confidence score and guidance.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .pdf bank statement.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 10MB size limit.")

    db = DataService(user.id)
    existing_txs = await db.get_transactions(limit=1000)

    try:
        preview = parse_pdf_statement(content, existing_transactions=existing_txs)
        return preview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF statement: {str(e)}")

@router.post("/confirm", response_model=StatementConfirmResponse)
async def confirm_statement_import(
    req: StatementConfirmRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Inserts confirmed transactions selected by the user.
    Skips unselected duplicates and records source as csv or pdf.
    """
    db = DataService(user.id)
    
    to_insert = []
    skipped_count = 0

    for item in req.transactions:
        # If user decided to skip marked duplicates
        if item.is_duplicate:
            skipped_count += 1
            continue

        to_insert.append({
            "account_id": req.account_id,
            "date": item.date,
            "description": item.description,
            "amount": item.amount,
            "transaction_type": item.transaction_type,
            "category": item.category or "Other",
            "merchant": item.merchant,
            "source": "csv" if not item.id or "preview" in item.id else "pdf"
        })

    if not to_insert:
        return {
            "imported_count": 0,
            "skipped_count": skipped_count,
            "message": "No new transactions were selected for import."
        }

    imported_count = await db.batch_insert_transactions(to_insert)

    return {
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "message": f"Successfully imported {imported_count} transactions ({skipped_count} skipped as duplicates)."
    }
