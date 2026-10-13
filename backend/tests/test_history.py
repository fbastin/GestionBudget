"""History of the totals, behind the charts of the dashboard."""
from helpers import create


def test_history_has_no_net_worth_before_the_first_asset_value(client):
    house = create(client, "/assets", name="Maison", type="Immobilier")
    loan = create(client, "/liabilities", name="Prêt", type="Prêt")
    # A debt recorded years before any asset value: that date has no assets, hence no net worth
    create(client, "/snapshots", date="2019-12-31", liability_id=loan["id"], amount=400)
    create(client, "/snapshots", date="2026-01-31", liability_id=loan["id"], amount=100)
    create(client, "/snapshots", date="2026-01-31", asset_id=house["id"], amount=300)
    history = client.get("/history").json()
    assert [(h["date"], h["assets"], h["liabilities"], h["net_worth"]) for h in history] == [
        ("2019-12-31", None, 400, None), ("2026-01-31", 300, 100, 200)]
