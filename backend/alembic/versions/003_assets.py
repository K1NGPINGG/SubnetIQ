"""Create assets table for discovered devices.

Revision ID: 003_assets
Revises: 002_scheduled_scans
Create Date: 2026-07-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "003_assets"
down_revision = "002_scheduled_scans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists (from partial previous run)
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assets')")
    )
    table_exists = result.scalar()

    if not table_exists:
        op.create_table(
            "assets",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
            sa.Column("ip_address", sa.String(45), nullable=False),
            sa.Column("mac_address", sa.String(17), nullable=True),
            sa.Column("hostname", sa.String(255), nullable=True),
            sa.Column("domain", sa.String(255), nullable=True),
            sa.Column("device_type", sa.String(50), nullable=True, server_default="Unknown"),
            sa.Column("discovery_source", sa.String(20), nullable=False, server_default="PING"),
            sa.Column("manufacturer", sa.String(255), nullable=True),
            sa.Column("model", sa.String(255), nullable=True),
            sa.Column("serial_number", sa.String(255), nullable=True),
            sa.Column("os_name", sa.String(255), nullable=True),
            sa.Column("os_version", sa.String(255), nullable=True),
            sa.Column("cpu_cores", sa.Integer, nullable=True),
            sa.Column("ram_gb", sa.Float, nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="Online"),
            sa.Column("last_scanned_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("raw_scan_data", JSONB, nullable=True),
            sa.Column("network_interfaces", JSONB, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("ip_address", name="uq_assets_ip_address"),
        )

    # Create indexes only if they don't exist
    indexes = [
        ("ix_assets_tenant_id", "assets", ["tenant_id"]),
        ("ix_assets_ip_address", "assets", ["ip_address"]),
        ("ix_assets_hostname", "assets", ["hostname"]),
        ("ix_assets_discovery_source", "assets", ["discovery_source"]),
        ("ix_assets_status", "assets", ["status"]),
    ]
    for idx_name, table, columns in indexes:
        result = conn.execute(
            sa.text(f"SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = '{idx_name}')")
        )
        if not result.scalar():
            op.create_index(idx_name, table, columns)


def downgrade() -> None:
    op.drop_table("assets")
