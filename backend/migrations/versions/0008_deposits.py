"""money coming into an account

The app recorded only the money leaving an account (expenses, payments): without the pays and transfers
received, a bank account drifted below zero until its balance was entered again. A deposit adds to the
account that receives it and, when it comes from another account of the app, leaves that one.

Revision ID: 0008
Revises: 0006
Create Date: 2026-10-12 22:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '0008'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('deposits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=True),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('amount', sa.Float(), nullable=True),
    sa.Column('bank_id', sa.Integer(), nullable=True),
    sa.Column('asset_id', sa.Integer(), nullable=True),
    sa.Column('source_bank_id', sa.Integer(), nullable=True),
    sa.Column('source_asset_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
    sa.ForeignKeyConstraint(['bank_id'], ['banks.id'], ),
    sa.ForeignKeyConstraint(['source_asset_id'], ['assets.id'], ),
    sa.ForeignKeyConstraint(['source_bank_id'], ['banks.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('deposits', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_deposits_id'), ['id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('deposits', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_deposits_id'))
    op.drop_table('deposits')
