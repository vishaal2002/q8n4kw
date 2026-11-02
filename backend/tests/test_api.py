from fastapi.testclient import TestClient

from gale.main import app


def test_bundle_covers_the_three_books_and_rejects_anything_else():
    client = TestClient(app)
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["hours"] == 744

    bundle = client.get("/api/bundle")
    assert bundle.status_code == 200
    gates = bundle.json()["gates"]
    assert set(gates) == {"epex", "n2ex", "hh"}
    assert gates["epex"]["source"]["typicalPublishGmt"] == "07:30"
    assert gates["n2ex"]["source"]["typicalPublishGmt"] == "09:30"
    assert gates["hh"]["source"]["typicalPublishGmt"] == "11:30"
    assert gates["hh"]["source"]["exceptions"] == [{"date": "2026-01-16", "publishGmt": "12:25"}]
    assert gates["n2ex"]["source"]["exceptions"] == []

    missing = client.get("/api/desk", params={"gate": "intraday"})
    assert missing.status_code == 404
