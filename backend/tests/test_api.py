import io

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_investigations():
    response = client.get("/api/investigations")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "inv-orion-001"


def test_create_investigation():
    payload = {"name": "New case", "description": "Investigating a new incident"}
    response = client.post("/api/investigations", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New case"
    assert body["status"] == "Active"


def test_upload_and_list_documents():
    pdf = io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")
    pdf.name = "sample.pdf"
    response = client.post(
        "/api/investigations/inv-orion-001/documents/upload",
        files=[("files", (pdf.name, pdf, "application/pdf"))],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["documents"][0]["name"] == "sample.pdf"

    list_response = client.get("/api/investigations/inv-orion-001/documents")
    assert list_response.status_code == 200
    assert any(item["name"] == "sample.pdf" for item in list_response.json())


def test_assistant_query_returns_demo_answers():
    response = client.post(
        "/api/investigations/inv-orion-001/assistant/query",
        json={"question": "What happened on 12 March?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["answer"].startswith("The available reports document several relevant events")
    assert len(body["citations"]) >= 1


def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    assert "activeInvestigations" in response.json()
