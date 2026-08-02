"""IP address utilities: client IP extraction and IPv4/IPv6 helpers."""

import ipaddress
from typing import cast

from fastapi import Request


def get_client_ip(request: Request | None = None) -> str | None:
    """Extract client IP from request, respecting proxy headers."""
    if request is None:
        return None

    # Check X-Forwarded-For first (set by Nginx)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP (set by Nginx)
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return None


# ---------------------------------------------------------------------------
# Network parsing helpers (IPv4 + IPv6)
# ---------------------------------------------------------------------------

NetworkType = ipaddress.IPv4Network | ipaddress.IPv6Network
AddressType = ipaddress.IPv4Address | ipaddress.IPv6Address


def parse_network(network_address: str, prefix_length: int) -> NetworkType:
    """Parse a network from an address and prefix length (IPv4 or IPv6)."""
    try:
        network = ipaddress.ip_network(f"{network_address}/{prefix_length}", strict=False)
    except ValueError:
        raise ValueError(
            f"Invalid network: {network_address}/{prefix_length}"
        ) from None
    return network


def parse_address(address: str) -> AddressType:
    """Parse an IP address (IPv4 or IPv6)."""
    try:
        return ipaddress.ip_address(address)
    except ValueError:
        raise ValueError(f"Invalid IP address: {address}") from None


def address_family(address: str) -> int:
    """Return 4 for IPv4, 6 for IPv6."""
    return parse_address(address).version


def network_family(network_address: str, prefix_length: int) -> int:
    """Return the address family of a network."""
    return parse_network(network_address, prefix_length).version


def is_ipv6(network_address: str, prefix_length: int) -> bool:
    """Return True if the network is IPv6."""
    return parse_network(network_address, prefix_length).version == 6


def network_info(network_address: str, prefix_length: int) -> dict:
    """Calculate derived network attributes for IPv4 or IPv6.

    Returns a dict with network_address, broadcast_address, total_ips,
    usable_hosts, netmask, and gateway_suggestion.
    """
    network = parse_network(network_address, prefix_length)

    total_ips = network.num_addresses
    usable_hosts = network.num_addresses - 2
    if network.version == 6:
        usable_hosts = max(0, network.num_addresses - 2)

    gateway_suggestion = None
    first_host = next(network.hosts(), None)
    if first_host is not None:
        gateway_suggestion = str(first_host)

    return {
        "network_address": str(network.network_address),
        "broadcast_address": str(network.broadcast_address) if network.version == 4 else None,
        "total_ips": total_ips,
        "usable_hosts": usable_hosts,
        "netmask": str(network.netmask),
        "gateway_suggestion": gateway_suggestion,
        "family": network.version,
    }


def network_size(network_address: str, prefix_length: int) -> int:
    """Total number of addresses in a network (IPv4 or IPv6)."""
    return parse_network(network_address, prefix_length).num_addresses


def usable_host_count(network_address: str, prefix_length: int) -> int:
    """Number of usable host addresses (excluding network/broadcast where applicable).

    Special cases:
    - IPv6: /127 (point-to-point) and /128 (loopback/device) have no usable hosts
      beyond themselves, matching RFC 6164 semantics.
    """
    network = parse_network(network_address, prefix_length)
    if network.version == 6:
        if prefix_length >= 127:
            return 0
        return network.num_addresses - 2
    if prefix_length == 31 or prefix_length == 32:
        return network.num_addresses
    return network.num_addresses - 2


def networks_overlap(a: NetworkType, b: NetworkType) -> bool:
    """Return True if two networks overlap (same address family)."""
    if a.version != b.version:
        return False
    return a.overlaps(b)


def network_contains(parent: NetworkType, child: NetworkType) -> bool:
    """Return True if ``child`` is contained within ``parent`` (same family)."""
    if parent.version != child.version:
        return False
    # Narrow the union so mypy accepts typeshed's family-specific subnet_of().
    if parent.version == 4:
        return cast(ipaddress.IPv4Network, child).subnet_of(cast(ipaddress.IPv4Network, parent))
    return cast(ipaddress.IPv6Network, child).subnet_of(cast(ipaddress.IPv6Network, parent))


def find_parent_network(networks, network: NetworkType) -> NetworkType | None:
    """Find the most-specific containing network among candidates.

    ``networks`` is an iterable of (network_object, id). Returns the network
    object of the closest ancestor, or None if none contains ``network``.
    """
    parent = None
    parent_prefix = -1
    for candidate, _ in networks:
        if candidate.version != network.version:
            continue
        if network != candidate and network.subnet_of(candidate) and candidate.prefixlen > parent_prefix:
            parent = candidate
            parent_prefix = candidate.prefixlen
    return parent
