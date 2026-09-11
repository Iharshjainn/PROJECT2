from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.schemas.models import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter(prefix="/goals", tags=["Financial Goals"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_goals(user: AuthenticatedUser = Depends(get_current_user)):
    db = DataService(user.id)
    return await db.get_goals()

@router.post("", response_model=Dict[str, Any])
async def create_goal(
    goal: GoalCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    return await db.create_goal(goal.model_dump())

@router.put("/{goal_id}", response_model=Dict[str, Any])
async def update_goal(
    goal_id: str,
    goal: GoalUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    updates = {k: v for k, v in goal.model_dump().items() if v is not None}
    res = await db.update_goal(goal_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Goal not found or unauthorized")
    return res

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    success = await db.delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found or unauthorized")
    return {"message": "Goal deleted successfully"}
