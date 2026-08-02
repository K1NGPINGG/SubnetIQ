"""Granular Role-Based Access Control.

Defines a role hierarchy and an action/object-type permission matrix.
Dependencies built on top of these primitives let endpoints express
fine-grained authorisation such as ``Depends(require_permission("subnet", "delete"))``.

Role hierarchy (ascending):
    viewer < operator < engineer < admin

A role inherits all permissions of the roles below it.
"""


from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_active_user
from app.models.user import User

# Role hierarchy — ascending privilege order
ROLE_ORDER: list[str] = ["viewer", "operator", "engineer", "admin"]

# Role labels for the UI / API responses
ROLE_LABELS: dict[str, str] = {
    "viewer": "Viewer",
    "operator": "Operator",
    "engineer": "Engineer",
    "admin": "Admin",
}

VALID_ROLES: set[str] = set(ROLE_ORDER)

# Actions
CREATE = "create"
READ = "read"
UPDATE = "update"
DELETE = "delete"
APPROVE = "approve"
RUN = "run"
MANAGE = "manage"

ALL_ACTIONS = (CREATE, READ, UPDATE, DELETE, APPROVE, RUN, MANAGE)

# Core object types
ENTITY_SUBNET = "subnet"
ENTITY_IP = "ip_address"
ENTITY_VLAN = "vlan"
ENTITY_SITE = "site"
ENTITY_VRF = "vrf"
ENTITY_AGGREGATE = "aggregate"
ENTITY_RIR = "rir"
ENTITY_IP_RANGE = "ip_range"
ENTITY_ASN = "asn"
ENTITY_ASSET = "asset"
ENTITY_DISCOVERY = "discovery"
ENTITY_TAG = "tag"
ENTITY_CUSTOM_FIELD = "custom_field"
ENTITY_VALIDATION_RULE = "validation_rule"
ENTITY_USER = "user"
ENTITY_TENANT = "tenant"
ENTITY_AUDIT = "audit"
ENTITY_SNMP = "snmp_credential"
ENTITY_WINRM = "winrm_credential"
ENTITY_REPORT = "report"
ENTITY_WEBHOOK = "webhook"

ALL_ENTITIES = (
    ENTITY_SUBNET, ENTITY_IP, ENTITY_VLAN, ENTITY_SITE, ENTITY_VRF,
    ENTITY_AGGREGATE, ENTITY_RIR, ENTITY_IP_RANGE, ENTITY_ASN,
    ENTITY_ASSET, ENTITY_DISCOVERY, ENTITY_TAG, ENTITY_CUSTOM_FIELD,
    ENTITY_VALIDATION_RULE, ENTITY_USER, ENTITY_TENANT, ENTITY_AUDIT,
    ENTITY_SNMP, ENTITY_WINRM, ENTITY_REPORT, ENTITY_WEBHOOK,
)


def _all_read_entities() -> dict[str, set[str]]:
    """Every entity supports read for all roles by default."""
    return {entity: {READ} for entity in ALL_ENTITIES}


# Base matrix: minimum actions granted to each role for each entity type.
# Admins implicitly receive every action via the hierarchy (see below).
BASE_PERMISSION_MATRIX: dict[str, dict[str, set[str]]] = {
    "viewer": _all_read_entities(),
    "operator": {
        ENTITY_SUBNET: {READ, CREATE, UPDATE},
        ENTITY_IP: {READ, CREATE, UPDATE, DELETE},
        ENTITY_VLAN: {READ, CREATE, UPDATE},
        ENTITY_SITE: {READ, UPDATE},
        ENTITY_VRF: {READ, CREATE, UPDATE},
        ENTITY_AGGREGATE: {READ},
        ENTITY_RIR: {READ},
        ENTITY_IP_RANGE: {READ, CREATE, UPDATE},
        ENTITY_ASN: {READ, CREATE, UPDATE},
        ENTITY_ASSET: {READ, CREATE, UPDATE, DELETE},
        ENTITY_DISCOVERY: {READ, RUN},
        ENTITY_TAG: {READ, CREATE, UPDATE},
        ENTITY_CUSTOM_FIELD: {READ},
        ENTITY_VALIDATION_RULE: {READ},
        ENTITY_USER: {READ},
        ENTITY_TENANT: {READ},
        ENTITY_AUDIT: {READ},
        ENTITY_SNMP: {READ, CREATE, UPDATE, DELETE},
        ENTITY_WINRM: {READ, CREATE, UPDATE, DELETE},
        ENTITY_REPORT: {READ, RUN},
        ENTITY_WEBHOOK: {READ},
    },
    "engineer": {
        ENTITY_SUBNET: {READ, CREATE, UPDATE, DELETE, APPROVE},
        ENTITY_IP: {READ, CREATE, UPDATE, DELETE, APPROVE},
        ENTITY_VLAN: {READ, CREATE, UPDATE, DELETE},
        ENTITY_SITE: {READ, CREATE, UPDATE},
        ENTITY_VRF: {READ, CREATE, UPDATE, DELETE},
        ENTITY_AGGREGATE: {READ, CREATE, UPDATE, DELETE},
        ENTITY_RIR: {READ, CREATE, UPDATE, DELETE},
        ENTITY_IP_RANGE: {READ, CREATE, UPDATE, DELETE},
        ENTITY_ASN: {READ, CREATE, UPDATE, DELETE},
        ENTITY_ASSET: {READ, CREATE, UPDATE, DELETE, APPROVE},
        ENTITY_DISCOVERY: {READ, RUN, MANAGE},
        ENTITY_TAG: {READ, CREATE, UPDATE, DELETE},
        ENTITY_CUSTOM_FIELD: {READ, CREATE, UPDATE, DELETE},
        ENTITY_VALIDATION_RULE: {READ, CREATE, UPDATE, DELETE},
        ENTITY_USER: {READ, CREATE, UPDATE},
        ENTITY_TENANT: {READ},
        ENTITY_AUDIT: {READ},
        ENTITY_SNMP: {READ, CREATE, UPDATE, DELETE},
        ENTITY_WINRM: {READ, CREATE, UPDATE, DELETE},
        ENTITY_REPORT: {READ, RUN},
        ENTITY_WEBHOOK: {READ, CREATE, UPDATE, DELETE},
    },
    # Admin: full permissions on everything. Computed below.
    "admin": {},
}


def _compile_role_permissions() -> dict[str, dict[str, set[str]]]:
    """Build the effective permission set for each role by folding in the
    hierarchy (each role inherits everything from lower roles) and granting
    admin full access to every entity/action."""
    matrix: dict[str, dict[str, set[str]]] = {}

    # Inherit from lower roles first (in ascending order)
    cumulative: dict[str, set[str]] = {entity: set() for entity in ALL_ENTITIES}
    for role in ROLE_ORDER:
        role_matrix = BASE_PERMISSION_MATRIX.get(role, {})
        # Fold in the higher-privileged subset defined for this role
        for entity in ALL_ENTITIES:
            if role != "admin":
                cumulative[entity] |= role_matrix.get(entity, set())
        matrix[role] = {entity: set(actions) for entity, actions in cumulative.items()}

    # Grant admin every action on every entity
    matrix["admin"] = {
        entity: set(ALL_ACTIONS) for entity in ALL_ENTITIES
    }
    return matrix


ROLE_PERMISSIONS: dict[str, dict[str, set[str]]] = _compile_role_permissions()


def role_rank(role: str) -> int:
    """Return the privilege rank of a role (higher is more privileged)."""
    if role in ROLE_ORDER:
        return ROLE_ORDER.index(role)
    return -1


def has_permission(user: User, entity: str, action: str) -> bool:
    """Return whether a user may perform ``action`` on ``entity``."""
    if not user or not getattr(user, "role", None):
        return False
    allowed = ROLE_PERMISSIONS.get(user.role, {}).get(entity, set())
    return action in allowed


def require_permission(entity: str, action: str):
    """FastAPI dependency factory enforcing an entity+action permission."""
    if entity not in ALL_ENTITIES:
        raise ValueError(f"Unknown entity type: {entity}")
    if action not in ALL_ACTIONS:
        raise ValueError(f"Unknown action: {action}")

    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if not has_permission(current_user, entity, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{current_user.role}' is not permitted to "
                    f"{action} {entity}"
                ),
            )
        return current_user

    return permission_checker


def effective_permissions(user: User) -> dict[str, list[str]]:
    """Return all effective permissions for a user as an entity->actions map."""
    return {
        entity: sorted(actions)
        for entity, actions in ROLE_PERMISSIONS.get(user.role, {}).items()
    }
