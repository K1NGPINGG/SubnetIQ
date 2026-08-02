"""Unit tests for RBAC role hierarchy and permission checks."""

from app.core.rbac import (
    ALL_ENTITIES,
    ROLE_ORDER,
    effective_permissions,
    has_permission,
    role_rank,
)


class FakeUser:
    def __init__(self, role):
        self.role = role


class TestRoleHierarchy:
    def test_order(self):
        assert ROLE_ORDER == ["viewer", "operator", "engineer", "admin"]

    def test_rank_ordering(self):
        ranks = [role_rank(r) for r in ROLE_ORDER]
        assert ranks == sorted(ranks)

    def test_unknown_role_rank(self):
        assert role_rank("superuser") == -1


class TestHasPermission:
    def test_viewer_read_all(self):
        for entity in ALL_ENTITIES:
            assert has_permission(FakeUser("viewer"), entity, "read"), entity

    def test_viewer_no_write(self):
        assert not has_permission(FakeUser("viewer"), "subnet", "create")
        assert not has_permission(FakeUser("viewer"), "ip_address", "delete")

    def test_operator_can_create_subnet(self):
        assert has_permission(FakeUser("operator"), "subnet", "create")

    def test_operator_cannot_delete_subnet(self):
        assert not has_permission(FakeUser("operator"), "subnet", "delete")

    def test_engineer_can_delete(self):
        assert has_permission(FakeUser("engineer"), "subnet", "delete")
        assert has_permission(FakeUser("engineer"), "site", "create")

    def test_engineer_can_approve_ip(self):
        assert has_permission(FakeUser("engineer"), "ip_address", "approve")

    def test_operator_cannot_approve(self):
        assert not has_permission(FakeUser("operator"), "ip_address", "approve")

    def test_admin_full_access(self):
        for entity in ALL_ENTITIES:
            for action in ("create", "read", "update", "delete", "approve", "run", "manage"):
                assert has_permission(FakeUser("admin"), entity, action), (entity, action)

    def test_inheritance(self):
        # Engineer inherits everything operator has
        for entity in ALL_ENTITIES:
            for action in ("create", "read", "update", "delete"):
                if has_permission(FakeUser("operator"), entity, action):
                    assert has_permission(FakeUser("engineer"), entity, action), (entity, action)

    def test_unknown_role_denied(self):
        assert not has_permission(FakeUser("guest"), "subnet", "read")


class TestEffectivePermissions:
    def test_viewer(self):
        perms = effective_permissions(FakeUser("viewer"))
        assert perms["subnet"] == ["read"]
        assert perms["ip_address"] == ["read"]

    def test_admin_full(self):
        perms = effective_permissions(FakeUser("admin"))
        for entity in ALL_ENTITIES:
            assert perms[entity] == sorted(
                ["create", "read", "update", "delete", "approve", "run", "manage"]
            )
