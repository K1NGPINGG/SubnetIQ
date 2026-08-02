"""Pagination utilities for list endpoints.

Backwards-compatible approach: list endpoints continue to return a plain
JSON array (preserving the existing frontend contract) while exposing the
total matching record count via the ``X-Total-Count`` response header and
a standard ``{page, page_size}`` echo through ``X-Page`` / ``X-Page-Size``.
"""


from fastapi import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


def set_pagination_headers(
    response: Response,
    total: int,
    skip: int,
    limit: int,
) -> Response:
    """Attach pagination metadata headers to a response."""
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(skip // limit if limit else 0)
    response.headers["X-Page-Size"] = str(limit)
    return response


async def fetch_page(
    db: AsyncSession,
    query,
    skip: int,
    limit: int,
) -> tuple:
    """Execute a select query with count + offset/limit pagination.

    Returns ``(rows, total)`` where ``rows`` is a list of ORM objects and
    ``total`` is the total number of matching rows (ignoring pagination).
    """
    total_result = await db.execute(
        select(func.count()).select_from(query.order_by(None).subquery())
    )
    total = total_result.scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.scalars().all()
    return rows, total
