"""Make subnet_id nullable in discovery_scans for asset discovery tracking.

Revision ID: 005
Revises: 004
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "005"
down_revision = "004_winrm_credentials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "discovery_scans",
        "subnet_id",
        existing_type=UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "discovery_scans",
        "subnet_id",
        existing_type=UUID(as_uuid=True),
        nullable=False,
    )
