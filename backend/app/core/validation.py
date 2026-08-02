"""Custom field & validation rule enforcement service.

Provides helpers to validate ``custom_fields`` payloads against registered
``CustomField`` definitions and to evaluate ``CustomValidationRule``
constraints before create/update/delete operations.
"""

import re
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custom_field import CustomField
from app.models.custom_validation import CustomValidationRule

_VALID_FIELD_TYPES = {"text", "integer", "float", "boolean", "date", "select"}
_DATE_FORMAT = "%Y-%m-%d"


class ValidationError(ValueError):
    """Raised when a custom field or validation rule is violated."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


async def get_fields_for(db: AsyncSession, entity_type: str) -> list[CustomField]:
    """Return enabled custom fields applicable to ``entity_type``."""
    result = await db.execute(select(CustomField).order_by(CustomField.weight))
    fields = []
    for field in result.scalars().all():
        applies = [part.strip() for part in (field.applies_to or "").split(",") if part.strip()]
        if entity_type in applies:
            fields.append(field)
    return fields


def _coerce_boolean(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
    raise ValidationError(f"Value '{value}' is not a valid boolean")


def _coerce_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            datetime.strptime(value, _DATE_FORMAT)
            return value
        except ValueError:
            raise ValidationError(f"Value '{value}' is not a valid date (expected YYYY-MM-DD)") from None
    raise ValidationError(f"Value '{value}' is not a valid date")


def _coerce_number(value: Any, field_type: str) -> Any:
    if isinstance(value, bool):
        raise ValidationError(f"Value '{value}' is not a valid {field_type}")
    try:
        if field_type == "integer":
            return int(value)
        return float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"Value '{value}' is not a valid {field_type}") from None


def validate_custom_fields(
    fields: list[CustomField],
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    """Validate a ``custom_fields`` payload against field definitions.

    Returns a normalized payload (missing fields filled with defaults,
    values coerced to the declared field type). Raises ``ValidationError``
    on any violation.
    """
    if payload is None:
        payload = {}

    definitions = {field.name: field for field in fields}
    for field in fields:
        if field.name not in payload:
            if field.required:
                raise ValidationError(f"Custom field '{field.name}' is required")
            if field.default_value not in (None, ""):
                payload[field.name] = field.default_value

    for name, value in payload.items():
        if name not in definitions:
            # Unknown custom fields are tolerated but dropped to keep data clean.
            continue
        field = definitions[name]

        if value is None:
            if field.required:
                raise ValidationError(f"Custom field '{name}' is required")
            continue

        field_type = field.field_type or "text"
        if field_type not in _VALID_FIELD_TYPES:
            continue

        if field_type == "boolean":
            payload[name] = _coerce_boolean(value)
        elif field_type == "date":
            payload[name] = _coerce_date(value)
        elif field_type in {"integer", "float"}:
            payload[name] = _coerce_number(value, field_type)
        elif field_type == "select":
            choices = [str(choice) for choice in (field.choices or [])]
            if choices and str(value) not in choices:
                raise ValidationError(
                    f"Custom field '{name}' must be one of: {', '.join(choices)}"
                )

    return payload


async def enforce_validation_rules(
    db: AsyncSession,
    entity_type: str,
    data: dict[str, Any] | None,
    operation: str = "update",
) -> None:
    """Evaluate enabled custom validation rules for the given entity.

    ``operation`` is one of "create", "update" or "delete". Rules are
    evaluated in weight order; the first violation raises.
    """
    result = await db.execute(
        select(CustomValidationRule).where(
            CustomValidationRule.entity_type == entity_type,
            CustomValidationRule.enabled.is_(True),
        ).order_by(CustomValidationRule.weight)
    )
    data = data or {}
    for rule in result.scalars().all():
        if operation == "delete" and not rule.enforce_on_delete:
            continue
        if operation != "delete" and rule.enforce_on_delete:
            # Guard rules protect from deletion only.
            continue
        condition = rule.condition or {}
        if _matches_condition(data, condition):
            raise ValidationError(rule.error_message)


def _matches_condition(data: dict[str, Any], condition: dict[str, Any]) -> bool:
    """Check whether ``data`` matches a flat condition mapping.

    Supports exact equality, and simple operators encoded as a dict value:
    {"field": {"eq": 5}}, {"field": {"ne": "x"}}, {"field": {"in": [...]}}.
    """
    if not condition:
        return True
    for key, expected in condition.items():
        actual = data.get(key)
        if isinstance(expected, dict):
            for op, operand in expected.items():
                if op == "eq" and actual != operand or op == "ne" and actual == operand or op == "in" and (not isinstance(operand, list) or actual not in operand) or op == "contains" and (operand not in (actual or [])):
                    return False
        else:
            if actual != expected:
                return False
    return True


def validate_required_fields(
    entity_type: str,
    fields: list[CustomField],
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    """Backwards-compatible wrapper around :func:`validate_custom_fields`."""
    return validate_custom_fields(fields, payload)


def slugify(value: str) -> str:
    """Generate a URL-safe slug from a string."""
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "untitled"
