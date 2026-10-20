import pytest

from helpers import balances, create, item_snapshots, upload

CSV_HEADER = "Date,Description,Amount,Interest,Account,Type\n"


@pytest.fixture
def accounts(client):
    """A "Visa" debt of 1000 (credit "Visa"), entered on 2026-01-01 and on 2026-06-01, and a "Compte" account of
    5000 at the bank "Banque". The entered balance of 2026-06-01 already counts what happened before it."""
    debt = create(client, "/liabilities", name="Visa", type="Carte de crédit")
    create(client, "/snapshots", date="2026-01-01", amount=1000, liability_id=debt["id"])
    create(client, "/snapshots", date="2026-06-01", amount=1000, liability_id=debt["id"])
    credit = create(client, "/credits", name="Visa", type="Carte de crédit", liability_id=debt["id"])
    bank = create(client, "/banks", name="Banque")
    account = create(client, "/assets", name="Compte", type="Banque", bank_id=bank["id"])
    create(client, "/snapshots", date="2026-01-01", amount=5000, asset_id=account["id"])
    return {"debt": debt["id"], "credit": credit["id"], "bank": bank["id"], "account": account["id"]}


def from_account(accounts):
    return {"bank_id": accounts["bank"], "asset_id": accounts["account"]}


def test_expense_on_a_credit_adds_to_the_debt_until_the_next_entered_balance(client, accounts):
    create(client, "/expenses", date="2026-03-01", description="Épicerie", amount=200, credit_id=accounts["credit"])
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-03-01": 1200, "2026-06-01": 1000}


def test_expense_from_an_account_is_taken_from_it(client, accounts):
    create(client, "/expenses", date="2026-02-01", description="Loyer", amount=300, **from_account(accounts))
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-02-01": 4700}


def test_expense_from_a_bank_without_account_updates_the_bank_balance(client):
    bank = create(client, "/banks", name="Sans compte", balance=100)
    create(client, "/expenses", date="2026-02-01", description="Café", amount=30, bank_id=bank["id"])
    assert client.get("/banks").json()[0]["balance"] == 70


def test_payment_repays_the_capital_only(client, accounts):
    create(client, "/payments", date="2026-02-01", description="Hypothèque", amount=300, interest=50,
           liability_id=accounts["debt"], **from_account(accounts))
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-02-01": 750, "2026-06-01": 1000}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-02-01": 4700}


def test_editing_an_expense_moves_its_impact(client, accounts):
    expense = create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    assert client.patch(f"/expenses/{expense['id']}", json={"date": "2026-02-01", "amount": 250}).status_code == 200
    assert balances(client, "liabilities", accounts["debt"]) == {
        "2026-01-01": 1000, "2026-02-01": 1250, "2026-03-01": 1250, "2026-06-01": 1000}


def test_editing_a_payment_can_move_it_to_another_debt(client, accounts):
    car = create(client, "/liabilities", name="Auto", type="Prêt")
    create(client, "/snapshots", date="2026-01-01", amount=8000, liability_id=car["id"])
    payment = create(client, "/payments", date="2026-02-01", description="p", amount=400,
                     liability_id=accounts["debt"], **from_account(accounts))
    assert client.patch(f"/payments/{payment['id']}", json={"liability_id": car["id"]}).status_code == 200
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-02-01": 1000, "2026-06-01": 1000}
    assert balances(client, "liabilities", car["id"]) == {"2026-01-01": 8000, "2026-02-01": 7600}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-02-01": 4600}


def test_deleting_transactions_restores_the_balances(client, accounts):
    expense = create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    payment = create(client, "/payments", date="2026-04-01", description="p", amount=300, interest=50,
                     liability_id=accounts["debt"], **from_account(accounts))
    assert client.delete(f"/expenses/{expense['id']}").status_code == 200
    assert client.delete(f"/payments/{payment['id']}").status_code == 200
    assert balances(client, "liabilities", accounts["debt"]) == {
        "2026-01-01": 1000, "2026-03-01": 1000, "2026-04-01": 1000, "2026-06-01": 1000}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-04-01": 5000}


def test_csv_import_applies_every_row(client, accounts):
    upload(client, "/import/expenses/csv", CSV_HEADER +
           "2026-02-01,A,100,0,Crédit: Visa,Dépense\n"
           "2026-02-01,B,50,0,Crédit: Visa,Dépense\n"
           "2026-03-01,C,20,0,Crédit: Visa,Dépense\n"
           "2026-03-01,D,300,0,Banque -> Visa,Remboursement\n")
    assert balances(client, "liabilities", accounts["debt"]) == {
        "2026-01-01": 1000, "2026-02-01": 1150, "2026-03-01": 870, "2026-06-01": 1000}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-03-01": 4700}


def snapshot_id(client, kind, item_id, day):
    return next(s["id"] for s in item_snapshots(client, kind, item_id) if s["date"] == day)


def test_setting_a_balance_shifts_the_computed_ones_after_it_until_deleted(client, accounts):
    create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    create(client, "/snapshots", date="2026-02-01", amount=1500, liability_id=accounts["debt"])
    # The computed balance of 2026-03-01 follows; the entered one of 2026-06-01 does not
    assert balances(client, "liabilities", accounts["debt"]) == {
        "2026-01-01": 1000, "2026-02-01": 1500, "2026-03-01": 1700, "2026-06-01": 1000}
    assert client.delete(f"/snapshots/{snapshot_id(client, 'liabilities', accounts['debt'], '2026-02-01')}").status_code == 200
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-03-01": 1200, "2026-06-01": 1000}


def test_deleting_an_old_balance_leaves_the_later_entered_ones_alone(client, accounts):
    # Deleting the first balance used to shift every later one by its amount
    assert client.delete(f"/snapshots/{snapshot_id(client, 'liabilities', accounts['debt'], '2026-01-01')}").status_code == 200
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-06-01": 1000}
    assert client.get("/dashboard").json()["total_liabilities"] == 1000


def test_editing_a_computed_balance_makes_it_an_entered_one(client, accounts):
    create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    create(client, "/snapshots", date="2026-03-01", amount=1150, liability_id=accounts["debt"])
    # An expense dated before it no longer moves it
    create(client, "/expenses", date="2026-02-01", description="y", amount=40, credit_id=accounts["credit"])
    assert balances(client, "liabilities", accounts["debt"]) == {
        "2026-01-01": 1000, "2026-02-01": 1040, "2026-03-01": 1150, "2026-06-01": 1000}


def test_reimporting_the_export_changes_nothing(client, accounts):
    create(client, "/expenses", date="2026-03-01", description="Épicerie, marché", amount=18.1, credit_id=accounts["credit"])
    # Payment on the debt itself while a credit has the same name: the export writes "Banque: Compte -> Visa" either way
    create(client, "/payments", date="2026-04-01", description="Paiement", amount=300, interest=12.5,
           liability_id=accounts["debt"], **from_account(accounts))
    before = (balances(client, "liabilities", accounts["debt"]), balances(client, "assets", accounts["account"]))

    message = upload(client, "/import/expenses/csv", client.get("/export/expenses/csv").text)

    assert message == "0 transaction(s) importée(s), 2 doublon(s) ignoré(s)."
    assert (balances(client, "liabilities", accounts["debt"]), balances(client, "assets", accounts["account"])) == before
    assert len(client.get("/expenses").json()) == 1 and len(client.get("/payments").json()) == 1


def test_the_csv_export_keeps_the_account_of_expenses_and_payments(client, accounts):
    # A second account at the same bank, which a bank name alone would not designate
    savings = create(client, "/assets", name="Épargne", type="Épargne", bank_id=accounts["bank"])["id"]
    create(client, "/snapshots", date="2026-01-01", amount=2000, asset_id=savings)
    on_savings = {"bank_id": accounts["bank"], "asset_id": savings}
    create(client, "/expenses", date="2026-02-01", description="Assurance", amount=170, **on_savings)
    create(client, "/payments", date="2026-03-01", description="Paiement", amount=300, credit_id=accounts["credit"], **on_savings)
    exported = client.get("/export/expenses/csv").text
    assert "Banque: Banque: Épargne,Dépense" in exported and "Banque: Épargne -> Visa" in exported
    before = balances(client, "assets", savings)

    # Imported after deletion: recreated on the same account, with the same effect
    client.delete(f"/expenses/{client.get('/expenses').json()[0]['id']}")
    client.delete(f"/payments/{client.get('/payments').json()[0]['id']}")
    assert upload(client, "/import/expenses/csv", exported) == "2 transaction(s) importée(s), 0 doublon(s) ignoré(s)."
    assert [(t["bank_id"], t["asset_id"]) for t in client.get("/expenses").json() + client.get("/payments").json()] == [
        (accounts["bank"], savings)] * 2
    assert balances(client, "assets", savings) == before
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000}

    # An export made before the account was written, with the bank alone: already there
    old = CSV_HEADER + "2026-02-01,Assurance,170,0,Banque: Banque,Dépense\n2026-03-01,Paiement,300,0,Banque -> Visa,Remboursement\n"
    assert upload(client, "/import/expenses/csv", old) == "0 transaction(s) importée(s), 2 doublon(s) ignoré(s)."


def test_identical_rows_are_skipped_only_as_often_as_already_recorded(client, accounts):
    coffee = "2026-03-01,Café,4.5,0,Crédit: Visa,Dépense\n"
    assert upload(client, "/import/expenses/csv", CSV_HEADER + coffee * 2) == "2 transaction(s) importée(s), 0 doublon(s) ignoré(s)."
    assert upload(client, "/import/expenses/csv", CSV_HEADER + coffee * 3) == "1 transaction(s) importée(s), 2 doublon(s) ignoré(s)."
    assert balances(client, "liabilities", accounts["debt"])["2026-03-01"] == 1013.5


def test_converting_an_expense_into_a_payment(client, accounts):
    expense = create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    response = client.post(f"/expenses/{expense['id']}/convert-to-payment", json={
        "date": "2026-03-01", "description": "Remboursement", "amount": 100, "credit_id": accounts["credit"], **from_account(accounts)})
    assert response.status_code == 200, response.text
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-03-01": 900, "2026-06-01": 1000}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-03-01": 4900}
    assert client.get("/expenses").json() == [] and len(client.get("/payments").json()) == 1


def test_converting_a_payment_into_an_expense(client, accounts):
    payment = create(client, "/payments", date="2026-02-01", description="p", amount=300,
                     liability_id=accounts["debt"], **from_account(accounts))
    response = client.post(f"/payments/{payment['id']}/convert-to-expense", json={
        "date": "2026-02-01", "description": "Achat", "amount": 50, "credit_id": accounts["credit"]})
    assert response.status_code == 200, response.text
    assert balances(client, "liabilities", accounts["debt"]) == {"2026-01-01": 1000, "2026-02-01": 1050, "2026-06-01": 1000}
    assert balances(client, "assets", accounts["account"]) == {"2026-01-01": 5000, "2026-02-01": 5000}
    assert client.get("/payments").json() == [] and len(client.get("/expenses").json()) == 1


def test_a_conversion_that_fails_midway_keeps_the_original(client, accounts, monkeypatch):
    from app import main

    expense = create(client, "/expenses", date="2026-03-01", description="x", amount=200, credit_id=accounts["credit"])
    before = balances(client, "liabilities", accounts["debt"])

    def crash(*args, **kwargs):
        raise RuntimeError("simulated failure after the expense was removed")

    monkeypatch.setattr(main, "apply_payment", crash)
    with pytest.raises(RuntimeError):
        client.post(f"/expenses/{expense['id']}/convert-to-payment", json={
            "date": "2026-03-01", "description": "p", "amount": 100, "credit_id": accounts["credit"]})

    assert [e["id"] for e in client.get("/expenses").json()] == [expense["id"]]
    assert client.get("/payments").json() == []
    assert balances(client, "liabilities", accounts["debt"]) == before


def test_amounts_are_kept_to_the_cent(client):
    debt = create(client, "/liabilities", name="Marge", type="Ligne de crédit")
    create(client, "/snapshots", date="2026-01-01", amount=0.1, liability_id=debt["id"])
    create(client, "/expenses", date="2026-01-01", description="x", amount=0.2, liability_id=debt["id"])
    # Plain floats would give 0.30000000000000004
    assert [s["amount"] for s in item_snapshots(client, "liabilities", debt["id"])] == [0.3]

    # A half cent is rounded up on input, and the balance moves by the stored amount
    expense = create(client, "/expenses", date="2026-01-02", description="y", amount=2.675, liability_id=debt["id"])
    assert expense["amount"] == 2.68
    assert [s["amount"] for s in item_snapshots(client, "liabilities", debt["id"])] == [0.3, 2.98]
    assert client.get("/dashboard").json()["total_liabilities"] == 2.98
    client.delete(f"/expenses/{expense['id']}")
    assert [s["amount"] for s in item_snapshots(client, "liabilities", debt["id"])] == [0.3, 0.3]
