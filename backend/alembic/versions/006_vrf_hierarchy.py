"""Add VRF support and address family fields.

Revision ID: 006_vrf_hierarchy
Revises: 005_discovery_scan_subnet_nullable
Create Date: 2026-08-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006_vrf_hierarchy"
down_revision = "005_discovery_scan_subnet_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # VRFs table
    op.create_table(
        "vrfs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("rd", sa.String(255), nullable=True, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enforce_unique", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Subnets: address family + role/status/container + vrf_id
    op.add_column("subnets", sa.Column("family", sa.Integer(), nullable=False, server_default="4"))
    op.add_column("subnets", sa.Column("role", sa.String(50), nullable=True))
    op.add_column("subnets", sa.Column("status", sa.String(20), nullable=False, server_default="active"))
    op.add_column("subnets", sa.Column("is_container", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("subnets", sa.Column("vrf_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vrfs.id", ondelete="SET NULL"), nullable=True, index=True))

    # IP addresses: address family + vrf_id
    op.add_column("ip_addresses", sa.Column("family", sa.Integer(), nullable=False, server_default="4"))
    op.add_column("ip_addresses", sa.Column("vrf_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vrfs.id", ondelete="SET NULL"), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("ip_addresses", "vrf_id")
    op.drop_column("ip_addresses", "family")
    op.drop_column("subnets", "vrf_id")
    op.drop_column("subnets", "is_container")
    op.drop_column("subnets", "status")
    op.drop_column("subnets", "role")
    op.drop_column("subnets", "family")
    op.drop_table("vrfs")
