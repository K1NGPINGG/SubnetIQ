"""Add tags, custom fields, and custom validation rules.

Revision ID: 008_tags_custom_fields
Revises: 007_hierarchy_models
Create Date: 2026-08-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008_tags_custom_fields"
down_revision = "007_hierarchy_models"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tags table (global catalog)
    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("color", sa.String(7), nullable=False, server_default="#1976D2"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Polymorphic tag associations
    op.create_table(
        "tag_associations",
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("entity_type", sa.String(100), nullable=False, primary_key=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    # Custom field definitions
    op.create_table(
        "custom_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("applies_to", sa.String(500), nullable=False),
        sa.Column("field_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_value", sa.Text(), nullable=True),
        sa.Column("choices", postgresql.JSONB(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Custom validation rules
    op.create_table(
        "custom_validation_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("entity_type", sa.String(100), nullable=False, index=True),
        sa.Column("condition", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enforce_on_delete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Add JSONB columns to subnets and ip_addresses
    op.add_column("subnets", sa.Column("tags", postgresql.JSONB(), nullable=True))
    op.add_column("subnets", sa.Column("custom_fields", postgresql.JSONB(), nullable=True))
    op.add_column("ip_addresses", sa.Column("tags", postgresql.JSONB(), nullable=True))
    op.add_column("ip_addresses", sa.Column("custom_fields", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("ip_addresses", "custom_fields")
    op.drop_column("ip_addresses", "tags")
    op.drop_column("subnets", "custom_fields")
    op.drop_column("subnets", "tags")
    op.drop_table("custom_validation_rules")
    op.drop_table("custom_fields")
    op.drop_table("tag_associations")
    op.drop_table("tags")
