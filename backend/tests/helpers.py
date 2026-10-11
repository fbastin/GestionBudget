def create(client, path, **data):
    response = client.post(path, json=data)
    assert response.status_code == 200, response.text
    return response.json()


def item_snapshots(client, kind, item_id):
    """Snapshots of a debt (kind="liabilities") or an account (kind="assets")."""
    return next(i for i in client.get(f"/{kind}").json() if i["id"] == item_id)["snapshots"]


def balances(client, kind, item_id):
    """{date: amount} of a debt or an account."""
    snapshots = item_snapshots(client, kind, item_id)
    result = {s["date"]: round(s["amount"], 2) for s in snapshots}
    assert len(result) == len(snapshots), "several snapshots on the same date"
    return result


def upload(client, path, content):
    response = client.post(path, files={"file": ("import.csv", content.encode("utf-8"), "text/csv")})
    assert response.status_code == 200, response.text
    return response.json()["message"]
