from fastapi import APIRouter

from app.services.data_store import dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary():
    return dashboard_summary()


@router.get("")
def get_dashboard():
    return dashboard_summary()
