"""Sync schema with models

Several tables, columns, and constraints were added to the models after the
original migration chain (001-011) was written. This migration brings any
existing database up to the current model schema and is safe to run both on a
fresh install (after 001-011) and on an existing database that already has the
newer objects (all statements use IF [NOT] EXISTS guards).

Revision ID: 012_sync_schema
Revises: 011_asn_bigint
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "012_sync_schema"
down_revision: Union[str, None] = "011_asn_bigint"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- Tables added to the models but missing from the migration chain ---
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS snmp_credentials (
            id uuid NOT NULL PRIMARY KEY,
            tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name varchar(100) NOT NULL,
            version varchar(10) NOT NULL DEFAULT 'v2c',
            community_string varchar(500),
            v3_username varchar(500),
            v3_auth_protocol varchar(10),
            v3_auth_passphrase varchar(500),
            v3_priv_protocol varchar(10),
            v3_priv_passphrase varchar(500),
            v3_security_level varchar(20),
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS system_logs (
            id uuid NOT NULL PRIMARY KEY,
            tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            level varchar(20) NOT NULL,
            category varchar(50) NOT NULL,
            message text NOT NULL,
            details text,
            source varchar(100),
            entity_type varchar(100),
            entity_id varchar(255),
            task_id varchar(255),
            duration_ms integer,
            ip_address varchar(45),
            user_id varchar(255),
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_snmp_credentials_tenant_id ON snmp_credentials (tenant_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_logs_tenant_id ON system_logs (tenant_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_logs_level ON system_logs (level)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_logs_category ON system_logs (category)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_logs_created_at ON system_logs (created_at)")

    # --- Columns added to existing models without migrations ---
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email varchar(255)")
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name varchar(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced boolean NOT NULL DEFAULT false")

    # --- Widen columns that are declared as String(500) in the models ---
    op.execute("ALTER TABLE winrm_credentials ALTER COLUMN password TYPE varchar(500)")
    op.execute("ALTER TABLE snmp_credentials ALTER COLUMN community_string TYPE varchar(500)")
    op.execute("ALTER TABLE snmp_credentials ALTER COLUMN v3_username TYPE varchar(500)")
    op.execute("ALTER TABLE snmp_credentials ALTER COLUMN v3_auth_passphrase TYPE varchar(500)")
    op.execute("ALTER TABLE snmp_credentials ALTER COLUMN v3_priv_passphrase TYPE varchar(500)")

    # --- Align indexes / constraints with the models ---
    # assets: unique index on ip_address instead of a unique constraint + extras
    op.execute("DROP INDEX IF EXISTS ix_assets_discovery_source")
    op.execute("DROP INDEX IF EXISTS ix_assets_status")
    op.execute("DROP INDEX IF EXISTS ix_assets_ip_address")
    op.execute("ALTER TABLE assets DROP CONSTRAINT IF EXISTS uq_assets_ip_address")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_assets_ip_address ON assets (ip_address)")
    # tags: slug index is now non-unique
    op.execute("DROP INDEX IF EXISTS ix_tags_slug")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tags_slug ON tags (slug)")
    # tenants: unique indexes instead of named unique constraints
    op.execute("ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_name_key")
    op.execute("ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_slug_key")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_tenants_name ON tenants (name)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_tenants_slug ON tenants (slug)")
    # users: unique index instead of unique constraint on azure_ad_id
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_azure_ad_id_key")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_azure_ad_id ON users (azure_ad_id)")
    # winrm_credentials: rename the tenant index to match the model
    op.execute("DROP INDEX IF EXISTS idx_winrm_credentials_tenant")
    op.execute("CREATE INDEX IF NOT EXISTS ix_winrm_credentials_tenant_id ON winrm_credentials (tenant_id)")

    # Column comment defined in the subnets model
    op.execute("COMMENT ON COLUMN subnets.is_container IS 'Container prefix housing child prefixes'")


def downgrade() -> None:
    """Best-effort reversal of the additive changes above."""
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS mfa_enforced")
    op.execute("ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_name")
    op.execute("ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_email")
    op.execute("DROP TABLE IF EXISTS system_logs")
    op.execute("DROP TABLE IF EXISTS snmp_credentials")
