"""Create winrm_credentials table."""

revision = "004_winrm_credentials"
down_revision = "003_assets"


def upgrade() -> None:
    from alembic import op
    import sqlalchemy as sa

    op.execute("""
        CREATE TABLE IF NOT EXISTS winrm_credentials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            port INTEGER NOT NULL DEFAULT 5985,
            use_ssl BOOLEAN NOT NULL DEFAULT FALSE,
            auth_type VARCHAR(20) NOT NULL DEFAULT 'basic',
            domain VARCHAR(255),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_winrm_credentials_tenant ON winrm_credentials(tenant_id);")


def downgrade() -> None:
    from alembic import op
    op.execute("DROP TABLE IF EXISTS winrm_credentials;")
