from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import (
    auth,
    dashboard,
    transactions,
    statements,
    analytics,
    financial_health,
    accounts,
    assets,
    liabilities,
    goals,
    scenarios,
    chatbot
)
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Personal Financial Health Platform API",
    description="Authoritative Financial Calculation Engine and AI Advisor Backend",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Health check
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "financial-health-backend",
        "environment": settings.ENVIRONMENT
    }

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(statements.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(financial_health.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(liabilities.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
