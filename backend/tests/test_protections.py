from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app import models
from helpers import create


def test_a_snapshot_needs_exactly_one_target(client):
    assert client.post("/snapshots", json={"date": "2026-01-01", "amount": 1}).status_code == 422
    assert client.post("/snapshots", json={"date": "2026-01-01", "amount": 1, "asset_id": 1, "liability_id": 1}).status_code == 422


def test_the_database_rejects_two_snapshots_on_the_same_day(client, db):
    debt = create(client, "/liabilities", name="Visa", type="Carte de crédit")
    create(client, "/snapshots", date="2026-01-01", amount=1000, liability_id=debt["id"])
    db.add(models.Snapshot(date=date(2026, 1, 1), liability_id=debt["id"], amount=1))
    with pytest.raises(IntegrityError):
        db.commit()


def test_a_credit_or_bank_used_by_transactions_cannot_be_deleted(client):
    debt = create(client, "/liabilities", name="Visa", type="Carte de crédit")
    credit = create(client, "/credits", name="Visa", type="Carte de crédit", liability_id=debt["id"])
    bank = create(client, "/banks", name="Banque", balance=100)
    expense = create(client, "/expenses", date="2026-02-01", description="x", amount=10, credit_id=credit["id"])
    payment = create(client, "/payments", date="2026-02-01", description="p", amount=5, bank_id=bank["id"], credit_id=credit["id"])
    refused = client.delete(f"/credits/{credit['id']}")
    assert refused.status_code == 409
    assert "2 transaction(s)" in refused.json()["detail"]
    assert client.delete(f"/banks/{bank['id']}").status_code == 409

    client.delete(f"/expenses/{expense['id']}")
    client.delete(f"/payments/{payment['id']}")
    assert client.delete(f"/credits/{credit['id']}").status_code == 200
    assert client.delete(f"/banks/{bank['id']}").status_code == 200


def test_writes_from_other_websites_are_refused(client):
    refused = client.post("/banks", json={"name": "Piège"}, headers={"Origin": "https://site-externe.example"})
    assert refused.status_code == 403
    assert client.post("/banks", json={"name": "Vite sur 5174"}, headers={"Origin": "http://localhost:5174"}).status_code == 200
    assert [b["name"] for b in client.get("/banks").json()] == ["Vite sur 5174"]
