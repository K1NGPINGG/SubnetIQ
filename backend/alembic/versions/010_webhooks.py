"""Add webhooks table.

Revision ID: 010_webhooks
Revises: 009_approval_requests
Create Date: 2026-08-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "010_webhooks"
down_revision = "009_approval_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2000), nullable=False),
        sa.Column("http_method", sa.String(10), nullable=False, server_default="POST"),
        sa.Column("secret", sa.String(500), nullable=True),
        sa.Column("events", postgresql.JSONB(), nullable=True),
        sa.Column("headers", postgresql.JSONB(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("ssl_verify", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("timeout", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_status", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("webhooks")
