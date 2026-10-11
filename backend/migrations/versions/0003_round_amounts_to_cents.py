"""round amounts to the cent

Float arithmetic left values such as 3349.1899999999996 in the database; amounts are now kept to the
cent by the Money column type (app/models.py).

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-11 18:40:00

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MONEY_COLUMNS = [
    ('snapshots', 'amount'), ('expenses', 'amount'), ('payments', 'amount'), ('payments', 'interest'),
    ('banks', 'balance'), ('credits', 'limit'), ('contributions', 'amount'),
]


def upgrade() -> None:
    for table, column in MONEY_COLUMNS:
        op.execute(f'UPDATE {table} SET "{column}" = ROUND("{column}", 2) WHERE "{column}" IS NOT NULL')


def downgrade() -> None:
    # The removed fractions of a cent cannot be restored: the app backs up the database before migrating
    pass
