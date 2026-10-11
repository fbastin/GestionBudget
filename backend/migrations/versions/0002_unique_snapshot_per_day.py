"""unique snapshot per item and day

Duplicates with identical amounts (double submissions) are removed first. Duplicates with different
amounts cannot be resolved automatically: the migration stops before changing anything.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-11 18:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TARGETS = ('asset_id', 'liability_id')


def upgrade() -> None:
    connection = op.get_bind()
    for column in TARGETS:
        conflicts = connection.execute(sa.text(
            f"SELECT {column}, date, group_concat(id) FROM snapshots WHERE {column} IS NOT NULL "
            f"GROUP BY {column}, date HAVING count(DISTINCT amount) > 1")).fetchall()
        if conflicts:
            details = '; '.join(f"{column}={item} le {day} (ids {ids})" for item, day, ids in conflicts)
            raise RuntimeError(f"Relevés en double avec des montants différents, à corriger avant de relancer : {details}")
    for column in TARGETS:
        # Keep the oldest snapshot of each group of identical duplicates
        op.execute(f"DELETE FROM snapshots WHERE {column} IS NOT NULL AND id NOT IN "
                   f"(SELECT min(id) FROM snapshots WHERE {column} IS NOT NULL GROUP BY {column}, date)")
    # if_not_exists: the app created these indexes at startup before migrations existed
    op.create_index('ux_snapshots_asset_date', 'snapshots', ['asset_id', 'date'], unique=True,
                    sqlite_where=sa.text('asset_id IS NOT NULL'), if_not_exists=True)
    op.create_index('ux_snapshots_liability_date', 'snapshots', ['liability_id', 'date'], unique=True,
                    sqlite_where=sa.text('liability_id IS NOT NULL'), if_not_exists=True)


def downgrade() -> None:
    with op.batch_alter_table('snapshots', schema=None) as batch_op:
        batch_op.drop_index('ux_snapshots_liability_date', sqlite_where=sa.text('liability_id IS NOT NULL'))
        batch_op.drop_index('ux_snapshots_asset_date', sqlite_where=sa.text('asset_id IS NOT NULL'))
