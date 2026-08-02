"""Add hierarchy models: RIRs, Aggregates, IP Ranges, ASNs.

Revision ID: 007_hierarchy_models
Revises: 006_vrf_hierarchy
Create Date: 2026-08-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007_hierarchy_models"
down_revision = "006_vrf_hierarchy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # RIRs table (global, not tenant-scoped)
    op.create_table(
        "rirs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Aggregates table
    op.create_table(
        "aggregates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("network_address", sa.String(45), nullable=False),
        sa.Column("prefix_length", sa.Integer(), nullable=False),
        sa.Column("family", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("rir_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rirs.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # IP Ranges table
    op.create_table(
        "ip_ranges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("start_address", sa.String(45), nullable=False),
        sa.Column("end_address", sa.String(45), nullable=False),
        sa.Column("family", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("subnet_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subnets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ASNs table
    op.create_table(
        "asns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("asn", sa.Integer(), nullable=False, index=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_32bit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("rir_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rirs.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("asns")
    op.drop_table("ip_ranges")
    op.drop_table("aggregates")
    op.drop_table("rirs")
