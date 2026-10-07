#!/bin/sh
set -eu
pg_bin=${PGBIN:-$(pg_config --bindir)}
pg_port=${MCP_TEST_PGPORT:-54365}
pg_dir=$(mktemp -d /tmp/calendar365-mcp-test.XXXXXX)
trap '"$pg_bin/pg_ctl" -D "$pg_dir/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$pg_dir"' EXIT INT TERM
"$pg_bin/initdb" -D "$pg_dir/data" -A trust -U postgres > "$pg_dir/init.log"
"$pg_bin/pg_ctl" -D "$pg_dir/data" -l "$pg_dir/server.log" -o "-p $pg_port -h 127.0.0.1" start > /dev/null
"$pg_bin/psql" -Xq -h 127.0.0.1 -p "$pg_port" -U postgres -v ON_ERROR_STOP=1 -f tests/mcp-bootstrap.sql > "$pg_dir/migrations.log"
for migration in supabase/migrations/*.sql; do
  "$pg_bin/psql" -Xq -h 127.0.0.1 -p "$pg_port" -U postgres -v ON_ERROR_STOP=1 -f "$migration" >> "$pg_dir/migrations.log" 2>&1
done
MCP_TEST_PGPORT="$pg_port" node --test tests/mcp.test.mjs
