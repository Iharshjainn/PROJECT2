import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer test_user_12345"}

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_dashboard_authenticated():
    response = client.get("/api/dashboard", headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert "total_balance" in data
    assert "health_score" in data
    assert "suggested_prompts" in data

def test_transactions_crud():
    # 1. Create transaction
    tx_payload = {
        "date": "2026-08-12",
        "description": "Zomato Dinner Order",
        "amount": 750.0,
        "transaction_type": "expense",
        "category": "Other" # will be auto-categorized to Food
    }
    create_res = client.post("/api/transactions", json=tx_payload, headers=AUTH_HEADER)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["category"] == "Food"
    tx_id = created["id"]

    # 2. List transactions
    list_res = client.get("/api/transactions", headers=AUTH_HEADER)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(t["id"] == tx_id for t in items)

    # 3. Update transaction
    update_res = client.put(f"/api/transactions/{tx_id}", json={"amount": 800.0}, headers=AUTH_HEADER)
    assert update_res.status_code == 200
    assert update_res.json()["amount"] == 800.0

    # 4. Delete transaction
    del_res = client.delete(f"/api/transactions/{tx_id}", headers=AUTH_HEADER)
    assert del_res.status_code == 200

def test_scenario_calculation_endpoint():
    payload = {
        "scenario_type": "one_time_purchase",
        "amount": 50000.0,
        "item_name": "Laptop"
    }
    res = client.post("/api/scenarios/calculate", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_type"] == "one_time_purchase"
    assert "authoritative_math" in data
    assert "status" in data

def test_unauthenticated_access():
    res = client.get("/api/dashboard")
    assert res.status_code == 401
