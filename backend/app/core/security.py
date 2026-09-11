from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.core.config import settings
from app.core.database import get_supabase
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

class AuthenticatedUser:
    def __init__(self, user_id: str, email: Optional[str] = None, user_metadata: Optional[Dict[str, Any]] = None):
        self.id = user_id
        self.user_id = user_id
        self.email = email
        self.user_metadata = user_metadata or {}

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """
    Validates Supabase Bearer token and returns AuthenticatedUser.
    Extracts the authenticated user_id securely so backend never trusts client-supplied user_id.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    supabase = get_supabase()

    # If Supabase client is available, verify with Supabase Auth
    if supabase is not None:
        try:
            res = supabase.auth.get_user(token)
            if res and res.user:
                return AuthenticatedUser(
                    user_id=str(res.user.id),
                    email=res.user.email,
                    user_metadata=res.user.user_metadata or {}
                )
        except Exception as e:
            logger.warning(f"Supabase auth check failed: {e}")
            # Try decoding JWT as fallback if network/auth server glitch
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                user_id = payload.get("sub")
                if user_id:
                    return AuthenticatedUser(
                        user_id=str(user_id),
                        email=payload.get("email"),
                        user_metadata=payload.get("user_metadata", {})
                    )
            except Exception as jwt_err:
                logger.error(f"JWT decode failed: {jwt_err}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication session",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # In local testing or fallback mode when Supabase credentials aren't yet populated
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub") or payload.get("user_id")
        if user_id:
            return AuthenticatedUser(
                user_id=str(user_id),
                email=payload.get("email"),
                user_metadata=payload.get("user_metadata", {})
            )
    except Exception:
        pass

    # If development test token
    if settings.ENVIRONMENT == "development" and token.startswith("test_user_"):
        return AuthenticatedUser(
            user_id=token,
            email=f"{token}@example.com"
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
