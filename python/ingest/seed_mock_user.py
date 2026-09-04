"""Seed a local development Clerk-synced user.

This script is intentionally environment-driven. Never hardcode production
database URLs or real Clerk ids in source.
"""

import os
import sys

import psycopg2


def main() -> int:
    database_url = os.environ.get("PYTHON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    clerk_id = os.environ.get("DEV_CLERK_USER_ID")
    email = os.environ.get("DEV_CLERK_USER_EMAIL", "dev@example.com")
    name = os.environ.get("DEV_CLERK_USER_NAME", "Development User")

    if not database_url:
        print("Missing PYTHON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        return 1

    if not clerk_id:
        print("Missing DEV_CLERK_USER_ID. Use a real Clerk development user id.", file=sys.stderr)
        return 1

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (clerk_id, email, name)
                VALUES (%s, %s, %s)
                ON CONFLICT (clerk_id)
                DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
                """,
                (clerk_id, email, name),
            )

    print(f"Seeded development user {clerk_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
