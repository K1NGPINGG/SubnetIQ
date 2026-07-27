"""Add scheduled scan fields to discovery_scans.

Revision ID: 002_scheduled_scans
Revises: 001_initial
Create Date: 2026-07-22
"""

from alembic import op
import sqlalchemy as sa

revision = "002_scheduled_scans"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("discovery_scans", sa.Column("is_scheduled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("discovery_scans", sa.Column("schedule_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("discovery_scans", sa.Column("is_recursive", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("discovery_scans", sa.Column("interval_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("discovery_scans", "interval_minutes")
    op.drop_column("discovery_scans", "is_recursive")
    op.drop_column("discovery_scans", "schedule_time")
    op.drop_column("discovery_scans", "is_scheduled")
