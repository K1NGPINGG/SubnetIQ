"""Add VIP inventory fields

Adds ``is_vip``/``vip_type`` to IP addresses and a ``vip_node_bindings``
association table that tracks which backing node IPs a Virtual IP points to.

Revision ID: 013_vip_inventory
Revises: 012_sync_schema
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "013_vip_inventory"
down_revision: Union[str, None] = "012_sync_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ip_addresses",
        sa.Column("is_vip", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "ip_addresses",
        sa.Column("vip_type", sa.String(length=20), nullable=True),
    )

    op.create_table(
        "vip_node_bindings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("vip_id", sa.UUID(), nullable=False),
        sa.Column("node_ip_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(["node_ip_id"], ["ip_addresses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vip_id"], ["ip_addresses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vip_node_bindings_vip_id", "vip_node_bindings", ["vip_id"])
    op.create_index("ix_vip_node_bindings_node_ip_id", "vip_node_bindings", ["node_ip_id"])


def downgrade() -> None:
    op.drop_index("ix_vip_node_bindings_node_ip_id", table_name="vip_node_bindings")
    op.drop_index("ix_vip_node_bindings_vip_id", table_name="vip_node_bindings")
    op.drop_table("vip_node_bindings")
    op.drop_column("ip_addresses", "vip_type")
    op.drop_column("ip_addresses", "is_vip")
