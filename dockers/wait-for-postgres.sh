#!/bin/sh
# wait-for-postgres.sh

set -e

echo "sleep 5"
sleep 5
kong migrations bootstrap
kong start
