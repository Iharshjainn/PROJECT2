from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from app.core.database import get_supabase, get_supabase_admin
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Fallback in-memory storage for test/offline development
_IN_MEMORY_DB: Dict[str, Dict[str, Dict[str, Any]]] = {
    "accounts": {},
    "transactions": {},
    "assets": {},
    "liabilities": {},
    "financial_goals": {},
    "profiles": {},
    "chatbot_conversations": {},
    "chatbot_messages": {}
}

class DataService:
    """
    Data access service enforcing strict user_id scoping across all queries.
    Uses Supabase PostgreSQL when credentials exist, with in-memory persistence fallback for tests.
    """
    def __init__(self, user_id: str):
        self.user_id = str(user_id)
        self.supabase = get_supabase_admin() or get_supabase()

    # -------------------------------------------------------------
    # PROFILES
    # -------------------------------------------------------------
    async def get_or_create_profile(self, email: Optional[str] = None, full_name: Optional[str] = None) -> Dict[str, Any]:
        if self.supabase:
            try:
                res = self.supabase.table("profiles").select("*").eq("user_id", self.user_id).execute()
                if res.data:
                    return res.data[0]
                # Insert
                new_profile = {
                    "id": str(uuid.uuid4()),
                    "user_id": self.user_id,
                    "email": email or f"user_{self.user_id[:8]}@example.com",
                    "full_name": full_name or "Financial Health User",
                    "currency": "INR"
                }
                insert_res = self.supabase.table("profiles").insert(new_profile).execute()
                return insert_res.data[0] if insert_res.data else new_profile
            except Exception as e:
                logger.warning(f"Supabase profile fetch error, using local fallback: {e}")

        # In-memory fallback
        user_profiles = [p for p in _IN_MEMORY_DB["profiles"].values() if p["user_id"] == self.user_id]
        if user_profiles:
            return user_profiles[0]
        p_id = str(uuid.uuid4())
        profile = {
            "id": p_id,
            "user_id": self.user_id,
            "email": email or f"user_{self.user_id[:8]}@example.com",
            "full_name": full_name or "Financial Health User",
            "currency": "INR",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        _IN_MEMORY_DB["profiles"][p_id] = profile
        return profile

    async def update_profile(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        if self.supabase:
            try:
                res = self.supabase.table("profiles").update(updates).eq("user_id", self.user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase profile update error: {e}")

        for p in _IN_MEMORY_DB["profiles"].values():
            if p["user_id"] == self.user_id:
                p.update(updates)
                p["updated_at"] = datetime.now().isoformat()
                return p
        return await self.get_or_create_profile()

    # -------------------------------------------------------------
    # ACCOUNTS
    # -------------------------------------------------------------
    async def get_accounts(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("accounts").select("*").eq("user_id", self.user_id).order("created_at").execute()
                return res.data or []
            except Exception as e:
                logger.warning(f"Supabase accounts fetch error: {e}")

        return [a for a in _IN_MEMORY_DB["accounts"].values() if a["user_id"] == self.user_id]

    async def create_account(self, data: Dict[str, Any]) -> Dict[str, Any]:
        record = {**data, "user_id": self.user_id, "id": str(uuid.uuid4()), "created_at": datetime.now().isoformat()}
        if self.supabase:
            try:
                res = self.supabase.table("accounts").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase create account error: {e}")

        _IN_MEMORY_DB["accounts"][record["id"]] = record
        return record

    async def delete_account(self, account_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("accounts").delete().eq("id", account_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete account error: {e}")

        if account_id in _IN_MEMORY_DB["accounts"] and _IN_MEMORY_DB["accounts"][account_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["accounts"][account_id]
            return True
        return False

    # -------------------------------------------------------------
    # TRANSACTIONS
    # -------------------------------------------------------------
    async def get_transactions(
        self,
        category: Optional[str] = None,
        transaction_type: Optional[str] = None,
        account_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                query = self.supabase.table("transactions").select("*, accounts(name)").eq("user_id", self.user_id)
                if category:
                    query = query.eq("category", category)
                if transaction_type:
                    query = query.eq("transaction_type", transaction_type)
                if account_id:
                    query = query.eq("account_id", account_id)
                if start_date:
                    query = query.gte("date", start_date)
                if end_date:
                    query = query.lte("date", end_date)
                if search:
                    query = query.ilike("description", f"%{search}%")
                res = query.order("date", desc=True).limit(limit).offset(offset).execute()
                
                # Format account_name
                out = []
                for item in (res.data or []):
                    acct = item.get("accounts")
                    item["account_name"] = acct.get("name") if isinstance(acct, dict) else None
                    out.append(item)
                return out
            except Exception as e:
                logger.warning(f"Supabase transactions fetch error: {e}")

        # In-memory filter
        res = [t for t in _IN_MEMORY_DB["transactions"].values() if t["user_id"] == self.user_id]
        if category:
            res = [t for t in res if t.get("category", "").lower() == category.lower()]
        if transaction_type:
            res = [t for t in res if t.get("transaction_type") == transaction_type]
        if account_id:
            res = [t for t in res if t.get("account_id") == account_id]
        if start_date:
            res = [t for t in res if str(t.get("date", "")) >= start_date]
        if end_date:
            res = [t for t in res if str(t.get("date", "")) <= end_date]
        if search:
            s = search.lower()
            res = [t for t in res if s in str(t.get("description", "")).lower()]

        # Sort date descending
        res.sort(key=lambda x: str(x.get("date", "")), reverse=True)
        return res[offset:offset+limit]

    async def create_transaction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        record = {
            **data,
            "user_id": self.user_id,
            "id": str(uuid.uuid4()),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        # Format date if date object
        if hasattr(record.get("date"), "isoformat"):
            record["date"] = record["date"].isoformat()

        if self.supabase:
            try:
                res = self.supabase.table("transactions").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase create transaction error: {e}")

        _IN_MEMORY_DB["transactions"][record["id"]] = record
        return record

    async def batch_insert_transactions(self, items: List[Dict[str, Any]]) -> int:
        count = 0
        records = []
        now_str = datetime.now().isoformat()
        for item in items:
            rec = {
                **item,
                "user_id": self.user_id,
                "id": str(uuid.uuid4()),
                "created_at": now_str,
                "updated_at": now_str
            }
            if hasattr(rec.get("date"), "isoformat"):
                rec["date"] = rec["date"].isoformat()
            records.append(rec)

        if self.supabase:
            try:
                res = self.supabase.table("transactions").insert(records).execute()
                return len(res.data) if res.data else len(records)
            except Exception as e:
                logger.warning(f"Supabase batch insert error: {e}")

        for r in records:
            _IN_MEMORY_DB["transactions"][r["id"]] = r
            count += 1
        return count

    async def update_transaction(self, tx_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now().isoformat()
        if hasattr(updates.get("date"), "isoformat"):
            updates["date"] = updates["date"].isoformat()

        if self.supabase:
            try:
                res = self.supabase.table("transactions").update(updates).eq("id", tx_id).eq("user_id", self.user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase update transaction error: {e}")

        if tx_id in _IN_MEMORY_DB["transactions"] and _IN_MEMORY_DB["transactions"][tx_id]["user_id"] == self.user_id:
            _IN_MEMORY_DB["transactions"][tx_id].update(updates)
            return _IN_MEMORY_DB["transactions"][tx_id]
        return None

    async def delete_transaction(self, tx_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("transactions").delete().eq("id", tx_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete transaction error: {e}")

        if tx_id in _IN_MEMORY_DB["transactions"] and _IN_MEMORY_DB["transactions"][tx_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["transactions"][tx_id]
            return True
        return False

    # -------------------------------------------------------------
    # ASSETS
    # -------------------------------------------------------------
    async def get_assets(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("assets").select("*").eq("user_id", self.user_id).order("current_value", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.warning(f"Supabase assets fetch error: {e}")

        return [a for a in _IN_MEMORY_DB["assets"].values() if a["user_id"] == self.user_id]

    async def create_asset(self, data: Dict[str, Any]) -> Dict[str, Any]:
        record = {**data, "user_id": self.user_id, "id": str(uuid.uuid4()), "created_at": datetime.now().isoformat()}
        if self.supabase:
            try:
                res = self.supabase.table("assets").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase create asset error: {e}")

        _IN_MEMORY_DB["assets"][record["id"]] = record
        return record

    async def update_asset(self, asset_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now().isoformat()
        if self.supabase:
            try:
                res = self.supabase.table("assets").update(updates).eq("id", asset_id).eq("user_id", self.user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase update asset error: {e}")

        if asset_id in _IN_MEMORY_DB["assets"] and _IN_MEMORY_DB["assets"][asset_id]["user_id"] == self.user_id:
            _IN_MEMORY_DB["assets"][asset_id].update(updates)
            return _IN_MEMORY_DB["assets"][asset_id]
        return None

    async def delete_asset(self, asset_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("assets").delete().eq("id", asset_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete asset error: {e}")

        if asset_id in _IN_MEMORY_DB["assets"] and _IN_MEMORY_DB["assets"][asset_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["assets"][asset_id]
            return True
        return False

    # -------------------------------------------------------------
    # LIABILITIES
    # -------------------------------------------------------------
    async def get_liabilities(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("liabilities").select("*").eq("user_id", self.user_id).order("outstanding_amount", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.warning(f"Supabase liabilities fetch error: {e}")

        return [l for l in _IN_MEMORY_DB["liabilities"].values() if l["user_id"] == self.user_id]

    async def create_liability(self, data: Dict[str, Any]) -> Dict[str, Any]:
        record = {**data, "user_id": self.user_id, "id": str(uuid.uuid4()), "created_at": datetime.now().isoformat()}
        if self.supabase:
            try:
                res = self.supabase.table("liabilities").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase create liability error: {e}")

        _IN_MEMORY_DB["liabilities"][record["id"]] = record
        return record

    async def update_liability(self, liability_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now().isoformat()
        if self.supabase:
            try:
                res = self.supabase.table("liabilities").update(updates).eq("id", liability_id).eq("user_id", self.user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase update liability error: {e}")

        if liability_id in _IN_MEMORY_DB["liabilities"] and _IN_MEMORY_DB["liabilities"][liability_id]["user_id"] == self.user_id:
            _IN_MEMORY_DB["liabilities"][liability_id].update(updates)
            return _IN_MEMORY_DB["liabilities"][liability_id]
        return None

    async def delete_liability(self, liability_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("liabilities").delete().eq("id", liability_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete liability error: {e}")

        if liability_id in _IN_MEMORY_DB["liabilities"] and _IN_MEMORY_DB["liabilities"][liability_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["liabilities"][liability_id]
            return True
        return False

    # -------------------------------------------------------------
    # FINANCIAL GOALS
    # -------------------------------------------------------------
    async def get_goals(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("financial_goals").select("*").eq("user_id", self.user_id).order("created_at").execute()
                goals = res.data or []
                return self._enrich_goals(goals)
            except Exception as e:
                logger.warning(f"Supabase goals fetch error: {e}")

        user_goals = [g for g in _IN_MEMORY_DB["financial_goals"].values() if g["user_id"] == self.user_id]
        return self._enrich_goals(user_goals)

    def _enrich_goals(self, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        enriched = []
        for g in goals:
            target = float(g.get("target_amount", 0.0))
            curr = float(g.get("current_amount", 0.0))
            pct = round((curr / target * 100.0) if target > 0 else 0.0, 1)
            rem = max(0.0, target - curr)
            
            # Required monthly saving if target_date exists
            req_monthly = None
            t_date_str = g.get("target_date")
            if t_date_str and rem > 0:
                try:
                    t_date = datetime.strptime(str(t_date_str)[:10], "%Y-%m-%d").date()
                    now_date = datetime.now().date()
                    months_left = max(1, (t_date.year - now_date.year) * 12 + (t_date.month - now_date.month))
                    req_monthly = round(rem / months_left, 2)
                except Exception:
                    pass

            enriched.append({
                **g,
                "progress_percentage": min(100.0, pct),
                "remaining_amount": round(rem, 2),
                "required_monthly_saving": req_monthly
            })
        return enriched

    async def create_goal(self, data: Dict[str, Any]) -> Dict[str, Any]:
        record = {**data, "user_id": self.user_id, "id": str(uuid.uuid4()), "created_at": datetime.now().isoformat()}
        if hasattr(record.get("target_date"), "isoformat"):
            record["target_date"] = record["target_date"].isoformat()

        if self.supabase:
            try:
                res = self.supabase.table("financial_goals").insert(record).execute()
                if res.data:
                    return self._enrich_goals(res.data)[0]
            except Exception as e:
                logger.warning(f"Supabase create goal error: {e}")

        _IN_MEMORY_DB["financial_goals"][record["id"]] = record
        return self._enrich_goals([record])[0]

    async def update_goal(self, goal_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now().isoformat()
        if hasattr(updates.get("target_date"), "isoformat"):
            updates["target_date"] = updates["target_date"].isoformat()

        if self.supabase:
            try:
                res = self.supabase.table("financial_goals").update(updates).eq("id", goal_id).eq("user_id", self.user_id).execute()
                if res.data:
                    return self._enrich_goals(res.data)[0]
            except Exception as e:
                logger.warning(f"Supabase update goal error: {e}")

        if goal_id in _IN_MEMORY_DB["financial_goals"] and _IN_MEMORY_DB["financial_goals"][goal_id]["user_id"] == self.user_id:
            _IN_MEMORY_DB["financial_goals"][goal_id].update(updates)
            return self._enrich_goals([_IN_MEMORY_DB["financial_goals"][goal_id]])[0]
        return None

    async def delete_goal(self, goal_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("financial_goals").delete().eq("id", goal_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete goal error: {e}")

        if goal_id in _IN_MEMORY_DB["financial_goals"] and _IN_MEMORY_DB["financial_goals"][goal_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["financial_goals"][goal_id]
            return True
        return False

    # -------------------------------------------------------------
    # CHATBOT CONVERSATIONS & MESSAGES
    # -------------------------------------------------------------
    async def get_conversations(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("chatbot_conversations").select("*").eq("user_id", self.user_id).order("updated_at", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.warning(f"Supabase conversations fetch error: {e}")

        convs = [c for c in _IN_MEMORY_DB["chatbot_conversations"].values() if c["user_id"] == self.user_id]
        convs.sort(key=lambda x: str(x.get("updated_at", "")), reverse=True)
        return convs

    async def create_conversation(self, title: str = "New Conversation") -> Dict[str, Any]:
        conv_id = str(uuid.uuid4())
        record = {
            "id": conv_id,
            "user_id": self.user_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        if self.supabase:
            try:
                res = self.supabase.table("chatbot_conversations").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase create conversation error: {e}")

        _IN_MEMORY_DB["chatbot_conversations"][conv_id] = record
        return record

    async def get_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self.supabase.table("chatbot_messages").select("*").eq("conversation_id", conversation_id).eq("user_id", self.user_id).order("created_at").execute()
                return res.data or []
            except Exception as e:
                logger.warning(f"Supabase messages fetch error: {e}")

        msgs = [m for m in _IN_MEMORY_DB["chatbot_messages"].values() if m["conversation_id"] == conversation_id and m["user_id"] == self.user_id]
        msgs.sort(key=lambda x: str(x.get("created_at", "")))
        return msgs

    async def add_message(self, conversation_id: str, role: str, content: str) -> Dict[str, Any]:
        msg_id = str(uuid.uuid4())
        record = {
            "id": msg_id,
            "conversation_id": conversation_id,
            "user_id": self.user_id,
            "role": role,
            "content": content,
            "created_at": datetime.now().isoformat()
        }
        if self.supabase:
            try:
                res = self.supabase.table("chatbot_messages").insert(record).execute()
                # Also touch conversation updated_at
                self.supabase.table("chatbot_conversations").update({"updated_at": datetime.now().isoformat()}).eq("id", conversation_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase add message error: {e}")

        _IN_MEMORY_DB["chatbot_messages"][msg_id] = record
        if conversation_id in _IN_MEMORY_DB["chatbot_conversations"]:
            _IN_MEMORY_DB["chatbot_conversations"][conversation_id]["updated_at"] = datetime.now().isoformat()
        return record

    async def delete_conversation(self, conversation_id: str) -> bool:
        if self.supabase:
            try:
                self.supabase.table("chatbot_conversations").delete().eq("id", conversation_id).eq("user_id", self.user_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Supabase delete conversation error: {e}")

        if conversation_id in _IN_MEMORY_DB["chatbot_conversations"] and _IN_MEMORY_DB["chatbot_conversations"][conversation_id]["user_id"] == self.user_id:
            del _IN_MEMORY_DB["chatbot_conversations"][conversation_id]
            # Delete messages
            to_del = [mid for mid, m in _IN_MEMORY_DB["chatbot_messages"].items() if m["conversation_id"] == conversation_id]
            for mid in to_del:
                del _IN_MEMORY_DB["chatbot_messages"][mid]
            return True
        return False
