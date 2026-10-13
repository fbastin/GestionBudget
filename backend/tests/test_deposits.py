"""Money coming into an account: pays and transfers received."""
import pytest

from helpers import balances, create


@pytest.fixture
def accounts(client):
    """A "Compte" account of 100 at the bank "Banque", entered on 2026-01-01 and 500 on 2026-06-01, and an
    "Épargne" account of 1000 at the bank "Autre"."""
    bank = create(client, "/banks", name="Banque")
    account = create(client, "/assets", name="Compte", type="Banque", bank_id=bank["id"])
    create(client, "/snapshots", date="2026-01-01", amount=100, asset_id=account["id"])
    create(client, "/snapshots", date="2026-06-01", amount=500, asset_id=account["id"])
    other = create(client, "/banks", name="Autre")
    savings = create(client, "/assets", name="Épargne", type="Banque", bank_id=other["id"])
    create(client, "/snapshots", date="2026-01-01", amount=1000, asset_id=savings["id"])
    return {"bank": bank["id"], "account": account["id"], "other": other["id"], "savings": savings["id"]}


def into_account(accounts):
    return {"bank_id": accounts["bank"], "asset_id": accounts["account"]}


def test_a_deposit_adds_to_its_account_until_the_next_entered_balance(client, accounts):
    create(client, "/deposits", date="2026-03-01", description="Paie", amount=2000, **into_account(accounts))
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 100, "2026-03-01": 2100, "2026-06-01": 500}


def test_a_transfer_leaves_its_source_account(client, accounts):
    create(client, "/deposits", date="2026-02-01", description="Virement", amount=300, **into_account(accounts),
           source_bank_id=accounts["other"], source_asset_id=accounts["savings"])
    assert balances(client, "assets", accounts["account"])["2026-02-01"] == 400
    assert balances(client, "assets", accounts["savings"]) == {"2026-01-01": 1000, "2026-02-01": 700}


def test_editing_then_deleting_a_deposit_restores_the_balances(client, accounts):
    deposit = create(client, "/deposits", date="2026-03-01", description="Paie", amount=2000, **into_account(accounts))
    response = client.patch(f"/deposits/{deposit['id']}", json={"date": "2026-02-01", "amount": 1500,
                                                                "source_bank_id": accounts["other"], "source_asset_id": accounts["savings"]})
    assert response.status_code == 200, response.text
    assert balances(client, "assets", accounts["account"]) == {
        "2026-01-01": 100, "2026-02-01": 1600, "2026-03-01": 1600, "2026-06-01": 500}
    assert balances(client, "assets", accounts["savings"]) == {"2026-01-01": 1000, "2026-02-01": -500}
    assert client.delete(f"/deposits/{deposit['id']}").status_code == 200
    assert balances(client, "assets", accounts["account"]) == {
        "2026-01-01": 100, "2026-02-01": 100, "2026-03-01": 100, "2026-06-01": 500}
    assert balances(client, "assets", accounts["savings"]) == {"2026-01-01": 1000, "2026-02-01": 1000}
    assert client.get("/deposits").json() == []


def test_a_deposit_to_a_bank_without_account_updates_the_bank_balance(client):
    bank = create(client, "/banks", name="Sans compte", balance=100)
    create(client, "/deposits", date="2026-02-01", description="Remboursement", amount=50, bank_id=bank["id"])
    assert client.get("/banks").json()[0]["balance"] == 150


def test_a_deposit_needs_the_account_receiving_it(client):
    response = client.post("/deposits", json={"date": "2026-02-01", "description": "Paie", "amount": 2000})
    assert response.status_code == 422


def test_a_bank_used_by_a_deposit_cannot_be_deleted(client, accounts):
    create(client, "/deposits", date="2026-02-01", description="Virement", amount=300, **into_account(accounts),
           source_bank_id=accounts["other"], source_asset_id=accounts["savings"])
    assert client.delete(f"/banks/{accounts['bank']}").status_code == 409
    assert client.delete(f"/banks/{accounts['other']}").status_code == 409
