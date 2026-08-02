"""Unit tests for webhook event matching and signing."""

from app.core.webhooks import _sign_payload, event_matches


class TestEventMatches:
    def test_empty_events_match_all(self):
        assert event_matches([], "subnet.create") is True
        assert event_matches(None, "ip_address.delete") is True

    def test_exact_match(self):
        assert event_matches(["subnet.create"], "subnet.create") is True
        assert event_matches(["subnet.create"], "subnet.delete") is False

    def test_entity_wildcard(self):
        assert event_matches(["subnet.*"], "subnet.create") is True
        assert event_matches(["subnet.*"], "subnet.delete") is True
        assert event_matches(["subnet.*"], "ip_address.create") is False

    def test_global_wildcard(self):
        assert event_matches(["*"], "anything.at.all") is True

    def test_multiple_patterns(self):
        assert event_matches(
            ["subnet.create", "ip_address.delete"], "ip_address.delete"
        ) is True
        assert event_matches(
            ["subnet.create", "ip_address.delete"], "vlan.update"
        ) is False


class TestSignPayload:
    def test_hmac_sha256(self):
        sig = _sign_payload("my-secret", b'{"event": "test"}')
        assert sig.startswith("sha256=")
        assert len(sig) == len("sha256=") + 64

    def test_deterministic(self):
        payload = b"same-payload"
        assert _sign_payload("k", payload) == _sign_payload("k", payload)

    def test_secret_matters(self):
        assert _sign_payload("k1", b"p") != _sign_payload("k2", b"p")
