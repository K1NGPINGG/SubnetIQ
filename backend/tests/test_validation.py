"""Unit tests for custom field and validation rule enforcement."""

import pytest

from app.core.validation import (
    ValidationError,
    _matches_condition,
    slugify,
    validate_custom_fields,
)
from app.models.custom_field import CustomField


def _field(name, field_type="text", required=False, default=None, choices=None):
    return CustomField(
        name=name,
        field_type=field_type,
        required=required,
        default_value=str(default) if default is not None else None,
        choices=choices,
    )


class TestValidateCustomFields:
    def test_plain_text_passthrough(self):
        fields = [_field("owner")]
        assert validate_custom_fields(fields, {"owner": "neteng"}) == {
            "owner": "neteng"
        }

    def test_missing_optional_filled_with_default(self):
        fields = [_field("env", default="dev")]
        assert validate_custom_fields(fields, {}) == {"env": "dev"}

    def test_required_missing_raises(self):
        fields = [_field("cost_center", required=True)]
        with pytest.raises(ValidationError):
            validate_custom_fields(fields, {})

    def test_required_provided_ok(self):
        fields = [_field("cost_center", required=True)]
        assert validate_custom_fields(fields, {"cost_center": "123"}) == {
            "cost_center": "123"
        }

    def test_integer_coercion(self):
        fields = [_field("cost_center", field_type="integer")]
        assert validate_custom_fields(fields, {"cost_center": "42"}) == {
            "cost_center": 42
        }

    def test_integer_invalid_raises(self):
        fields = [_field("cost_center", field_type="integer")]
        with pytest.raises(ValidationError):
            validate_custom_fields(fields, {"cost_center": "abc"})

    def test_boolean_coercion(self):
        fields = [_field("enabled", field_type="boolean")]
        assert validate_custom_fields(fields, {"enabled": "true"}) == {"enabled": True}
        assert validate_custom_fields(fields, {"enabled": "0"}) == {"enabled": False}

    def test_select_valid_choice(self):
        fields = [_field("env", field_type="select", choices=["prod", "dev"])]
        assert validate_custom_fields(fields, {"env": "prod"}) == {"env": "prod"}

    def test_select_invalid_choice_raises(self):
        fields = [_field("env", field_type="select", choices=["prod", "dev"])]
        with pytest.raises(ValidationError):
            validate_custom_fields(fields, {"env": "qa"})

    def test_unknown_field_preserved(self):
        fields = [_field("owner")]
        assert validate_custom_fields(fields, {"mystery": 1}) == {"mystery": 1}

    def test_none_value_not_filled_with_default(self):
        fields = [_field("env", default="dev")]
        assert validate_custom_fields(fields, {"env": None}) == {"env": None}


class TestMatchesCondition:
    def test_empty_condition(self):
        assert _matches_condition({"status": "active"}, {}) is True

    def test_exact(self):
        assert _matches_condition({"status": "active"}, {"status": "active"}) is True
        assert _matches_condition({"status": "inactive"}, {"status": "active"}) is False

    def test_eq_operator(self):
        assert _matches_condition({"status": "active"}, {"status": {"eq": "active"}}) is True

    def test_ne_operator(self):
        assert _matches_condition({"status": "active"}, {"status": {"ne": "inactive"}}) is True
        assert _matches_condition({"status": "active"}, {"status": {"ne": "active"}}) is False

    def test_in_operator(self):
        assert _matches_condition(
            {"status": "staging"}, {"status": {"in": ["staging", "dev"]}}
        ) is True
        assert _matches_condition(
            {"status": "prod"}, {"status": {"in": ["staging", "dev"]}}
        ) is False

    def test_contains_operator(self):
        assert _matches_condition(
            {"tags": ["a", "b"]}, {"tags": {"contains": "a"}}
        ) is True
        assert _matches_condition(
            {"tags": ["a", "b"]}, {"tags": {"contains": "z"}}
        ) is False


class TestSlugify:
    def test_basic(self):
        assert slugify("Prod Network") == "prod-network"

    def test_special_chars(self):
        assert slugify("  WAN -- Link   ") == "wan-link"

    def test_empty(self):
        assert slugify("!!!") == "untitled"
