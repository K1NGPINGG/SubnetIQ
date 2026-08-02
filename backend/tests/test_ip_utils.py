"""Unit tests for ip_utils IPv4/IPv6 helpers."""

import pytest

from app.core.ip_utils import (
    address_family,
    find_parent_network,
    network_family,
    network_info,
    network_size,
    parse_address,
    parse_network,
    usable_host_count,
)


class TestParseNetwork:
    def test_ipv4(self):
        net = parse_network("192.168.1.0", 24)
        assert str(net) == "192.168.1.0/24"
        assert net.version == 4

    def test_ipv4_strict_normalization(self):
        net = parse_network("192.168.1.15", 24)
        assert str(net.network_address) == "192.168.1.0"

    def test_ipv6(self):
        net = parse_network("2001:db8::", 64)
        assert str(net) == "2001:db8::/64"
        assert net.version == 6

    def test_invalid_network(self):
        with pytest.raises(ValueError):
            parse_network("not-an-ip", 24)

    def test_prefix_out_of_range(self):
        with pytest.raises(ValueError):
            parse_network("10.0.0.0", 33)


class TestParseAddress:
    def test_ipv4(self):
        assert str(parse_address("10.1.2.3")) == "10.1.2.3"

    def test_ipv6(self):
        assert str(parse_address("fe80::1")) == "fe80::1"

    def test_invalid(self):
        with pytest.raises(ValueError):
            parse_address("999.1.1.1")


class TestFamilyHelpers:
    def test_address_family(self):
        assert address_family("10.0.0.1") == 4
        assert address_family("2001:db8::1") == 6

    def test_network_family(self):
        assert network_family("10.0.0.0", 8) == 4
        assert network_family("2001:db8::", 32) == 6


class TestNetworkInfo:
    def test_ipv4_basic(self):
        info = network_info("192.168.1.0", 24)
        assert info["network_address"] == "192.168.1.0"
        assert info["total_ips"] == 256
        assert info["usable_hosts"] == 254
        assert info["broadcast_address"] == "192.168.1.255"
        assert info["netmask"] == "255.255.255.0"
        assert info["family"] == 4
        assert info["gateway_suggestion"] == "192.168.1.1"

    def test_ipv6_info(self):
        info = network_info("2001:db8::", 64)
        assert info["family"] == 6
        assert info["broadcast_address"] is None
        assert info["total_ips"] == 2**64


class TestUsableHostCount:
    def test_ipv4_24(self):
        assert usable_host_count("192.168.1.0", 24) == 254

    def test_ipv4_31(self):
        assert usable_host_count("10.0.0.0", 31) == 2

    def test_ipv4_32(self):
        assert usable_host_count("10.0.0.1", 32) == 1

    def test_ipv6_64(self):
        assert usable_host_count("2001:db8::", 64) == 2**64 - 2

    def test_ipv6_127(self):
        assert usable_host_count("2001:db8::", 127) == 0

    def test_ipv6_128(self):
        assert usable_host_count("2001:db8::1", 128) == 0


class TestNetworkSize:
    def test_ipv4(self):
        assert network_size("10.0.0.0", 24) == 256

    def test_ipv6(self):
        assert network_size("2001:db8::", 64) == 2**64


class TestFindParentNetwork:
    def _make(self, nets):
        return [(parse_network(a, p), i) for i, (a, p) in enumerate(nets)]

    def test_finds_most_specific_parent(self):
        candidates = self._make([("10.0.0.0", 8), ("10.1.0.0", 16), ("10.2.0.0", 16)])
        target = parse_network("10.1.5.0", 24)
        parent = find_parent_network(candidates, target)
        assert str(parent) == "10.1.0.0/16"

    def test_no_parent(self):
        candidates = self._make([("10.0.0.0", 8)])
        target = parse_network("11.0.0.0", 24)
        assert find_parent_network(candidates, target) is None

    def test_same_network_is_not_parent(self):
        candidates = self._make([("10.0.0.0", 24)])
        target = parse_network("10.0.0.0", 24)
        assert find_parent_network(candidates, target) is None

    def test_family_mismatch_ignored(self):
        candidates = self._make([("2001:db8::", 32)])
        target = parse_network("10.0.0.0", 24)
        assert find_parent_network(candidates, target) is None
