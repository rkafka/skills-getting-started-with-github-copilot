import os
import sys
import uuid

# Ensure the project's `src` package is importable when running tests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from fastapi.testclient import TestClient
import app as application

client = TestClient(application.app)


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unsubscribe_flow():
    activity = "Chess Club"
    email = f"test-{uuid.uuid4().hex}@example.com"

    # Signup should succeed
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert f"Signed up {email}" in r.json().get("message", "")

    # Participant should appear in activities listing
    r = client.get("/activities")
    assert email in r.json()[activity]["participants"]

    # Duplicate signup should be rejected
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 400

    # Remove the participant
    r = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r.status_code == 200
    assert f"Removed {email}" in r.json().get("message", "")

    # Ensure the participant is gone
    r = client.get("/activities")
    assert email not in r.json()[activity]["participants"]


def test_remove_nonexistent_participant_returns_404():
    r = client.delete("/activities/Chess Club/participants?email=not-present@example.com")
    assert r.status_code == 404
