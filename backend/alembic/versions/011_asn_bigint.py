"""Widen ASN column to BigInteger to support 32-bit ASNs.

Revision ID: 011_asn_bigint
Revises: 010_webhooks
Create Date: 2026-08-02
"""

from alembic import op
import sqlalchemy as sa

revision = "011_asn_bigint"
down_revision = "010_webhooks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("asns", "asn", existing_type=sa.Integer(), type_=sa.BigInteger(), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("asns", "asn", existing_type=sa.BigInteger(), type_=sa.Integer(), existing_nullable=False)
