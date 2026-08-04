"""Models package - import all models for Alembic discovery."""

from app.models.aggregate import Aggregate  # noqa: F401
from app.models.approval import ApprovalRequest  # noqa: F401
from app.models.asn import ASN  # noqa: F401
from app.models.asset import Asset  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.base import Base  # noqa: F401
from app.models.custom_field import CustomField  # noqa: F401
from app.models.custom_validation import CustomValidationRule  # noqa: F401
from app.models.discovery import DiscoveryScan  # noqa: F401
from app.models.ip_address import IPAddress, VIPNodeBinding  # noqa: F401
from app.models.ip_range import IPRange  # noqa: F401
from app.models.rir import RIR  # noqa: F401
from app.models.site import Site  # noqa: F401
from app.models.snmp_credential import SNMPCredential  # noqa: F401
from app.models.subnet import Subnet  # noqa: F401
from app.models.system_log import SystemLog  # noqa: F401
from app.models.tag import Tag, tag_associations  # noqa: F401
from app.models.tenant import Tenant  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.vlan import VLAN  # noqa: F401
from app.models.vrf import VRF  # noqa: F401
from app.models.webhook import Webhook  # noqa: F401
from app.models.winrm_credential import WinRMCredential  # noqa: F401
