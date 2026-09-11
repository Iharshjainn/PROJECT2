from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    """Returns initialized Supabase client with anon key."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
            return _supabase_client
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            return None
    return None

def get_supabase_admin() -> Optional[Client]:
    """Returns initialized Supabase client with service role key for admin operations."""
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client
    
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if settings.SUPABASE_URL and key:
        try:
            _supabase_admin_client = create_client(settings.SUPABASE_URL, key)
            return _supabase_admin_client
        except Exception as e:
            logger.error(f"Error initializing Supabase admin client: {e}")
            return None
    return None
