"""tell the balances computed from the transactions from those entered or imported

A correction at an earlier date (a balance entered, edited or deleted, a transaction) used to move every later
balance, observed ones included: deleting the first balance of a debt shifted all the others by its amount.
It now stops at the next balance entered or imported, which the new column `derived` tells apart.

Existing balances: one on the date of a transaction of its account was computed by the app (the rule of
app/main.py at the time); the others were entered or imported.

Revision ID: 0006
Revises: 0003
Create Date: 2026-10-12 21:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '0006'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Types of the account a bank's transactions go to, in app/main.py (apply_bank_impact)
CASH_TYPES = ('Banque', 'Cash', 'Liquidités', 'Checking', 'Chèque')


def derived_snapshot_ids(connection):
    rows = lambda sql: connection.execute(sa.text(sql)).all()
    bank_names = dict(rows("SELECT id, name FROM banks"))
    bank_assets = {}
    for asset_id, name, asset_type, bank_id in rows("SELECT id, name, type, bank_id FROM assets WHERE bank_id IS NOT NULL ORDER BY id"):
        bank_assets.setdefault(bank_id, []).append((asset_id, name or "", asset_type))

    def bank_account(bank_id):
        """The account a transaction of the bank goes to when it names none: same order of preference as the app."""
        assets = bank_assets.get(bank_id)
        if not assets:
            return None
        bank_name = (bank_names.get(bank_id) or "").lower()
        return (next((a for a, _, t in assets if t in CASH_TYPES), None)
                or next((a for a, n, _ in assets if bank_name in n.lower()), None)
                or assets[0][0])

    credit_debts = dict(rows("SELECT id, liability_id FROM credits"))
    asset_days, debt_days = set(), set()
    for table in ('expenses', 'payments'):
        for day, bank_id, asset_id, credit_id, liability_id in rows(
                f"SELECT date, bank_id, asset_id, credit_id, liability_id FROM {table}"):
            if bank_id:
                account = asset_id or bank_account(bank_id)
                if account:
                    asset_days.add((account, day))
            debt = liability_id or credit_debts.get(credit_id)
            if debt:
                debt_days.add((debt, day))
    return [snapshot_id for snapshot_id, day, asset_id, liability_id in rows("SELECT id, date, asset_id, liability_id FROM snapshots")
            if (asset_id, day) in asset_days or (liability_id, day) in debt_days]


def upgrade() -> None:
    op.add_column('snapshots', sa.Column('derived', sa.Boolean(), nullable=False, server_default=sa.false()))
    connection = op.get_bind()
    for snapshot_id in derived_snapshot_ids(connection):
        connection.execute(sa.text("UPDATE snapshots SET derived = 1 WHERE id = :id"), {"id": snapshot_id})


def downgrade() -> None:
    with op.batch_alter_table('snapshots', schema=None) as batch_op:
        batch_op.drop_column('derived')
