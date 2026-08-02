"""Webhook dispatch service.

Fires outgoing HTTP notifications for tenant audit events. Events follow
the pattern ``{entity_type}.{action}`` (e.g. ``subnet.create``). Subscriber
webhooks are matched by event pattern, signed with an HMAC-SHA256 signature
(when a secret is configured), and delivered with bounded retries.
"""

import asyncio
import hashlib
import hmac
import json
import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook

logger = logging.getLogger(__name__)

_SIGNATURE_HEADER = "X-Webhook-Signature"


def _sign_payload(secret: str, payload: bytes) -> str:
    digest = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()
    return f"sha256={digest}"


def event_matches(webhook_events: list[Any] | None, event: str) -> bool:
    """Return whether a webhook's event list matches the given event.

    Empty list means "all events". Wildcard ``*`` and trailing ``.*``
    patterns are supported (e.g. ``subnet.*`` matches ``subnet.create``).
    """
    if not webhook_events:
        return True
    for pattern in webhook_events:
        pattern = str(pattern)
        if pattern == "*" or pattern == event:
            return True
        if pattern.endswith(".*") and event.startswith(pattern[:-1]):
            return True
        if pattern.endswith("*") and event.startswith(pattern[:-1]):
            return True
    return False


async def _deliver(db: AsyncSession, webhook: Webhook, event: str, payload: dict[str, Any]) -> bool:
    """Deliver a single webhook payload with retries. Updates last_status."""
    body = json.dumps(payload, default=str).encode("utf-8")
    headers = dict(webhook.headers or {})
    headers["Content-Type"] = "application/json"
    if webhook.secret:
        headers[_SIGNATURE_HEADER] = _sign_payload(webhook.secret, body)

    method = (webhook.http_method or "POST").upper()
    attempts = max(1, webhook.retry_count or 1)
    timeout = httpx.Timeout(max(5, webhook.timeout or 5))

    for attempt in range(1, attempts + 1):
        try:
            async with httpx.AsyncClient(
                timeout=timeout, verify=webhook.ssl_verify
            ) as client:
                resp = await client.request(method, webhook.url, content=body, headers=headers)
            webhook.last_status = resp.status_code
            webhook.last_error = None
            db.add(webhook)
            if 200 <= resp.status_code < 300:
                return True
            logger.warning(
                "Webhook %s returned %s for %s",
                webhook.name, resp.status_code, event,
            )
        except Exception as exc:  # noqa: BLE001
            webhook.last_status = None
            webhook.last_error = str(exc)[:500]
            db.add(webhook)
            logger.warning("Webhook %s delivery failed: %s", webhook.name, exc)
        if attempt < attempts:
            await asyncio.sleep(min(2 ** attempt, 10))
    return False


async def dispatch_webhooks(
    db: AsyncSession,
    tenant_id: UUID,
    entity_type: str,
    action: str,
    event_data: dict[str, Any] | None = None,
    commit: bool = True,
) -> int:
    """Dispatch matching webhooks for a tenant's audit event.

    Returns the number of webhook deliveries attempted. Delivery failures
    are logged and persisted on the webhook row but never raise, so audit
    paths remain non-blocking.
    """
    event = f"{entity_type}.{action}"
    result = await db.execute(
        select(Webhook).where(
            Webhook.tenant_id == tenant_id,
            Webhook.enabled.is_(True),
        )
    )
    matched: list[Webhook] = [
        hook for hook in result.scalars().all()
        if event_matches(hook.events, event)
    ]
    if not matched:
        return 0

    payload = {
        "event": event,
        "entity_type": entity_type,
        "action": action,
        "data": event_data or {},
    }

    tasks = [_deliver(db, hook, event, payload) for hook in matched]
    await asyncio.gather(*tasks, return_exceptions=True)
    if commit:
        try:
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()
    return len(matched)
