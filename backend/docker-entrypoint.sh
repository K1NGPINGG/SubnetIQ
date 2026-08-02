#!/bin/bash
set -e

echo "GG_IPAM Backend starting..."

echo "Running database migrations..."
alembic upgrade head

echo "Starting application server..."
exec "$@"