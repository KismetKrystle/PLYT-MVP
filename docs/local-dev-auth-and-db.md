# Local Dev Auth And Database

Use this split so local testing stays separate from beta or production:

## Clerk

- Local frontend: test publishable key in `client/.env.local`
- Local backend: test secret key in `server/.env`
- Production frontend: live publishable key in Vercel
- Production backend: live secret key in Railway

That keeps Clerk development users separate from live users.

## Database

Your app backend writes to whatever `DATABASE_URL` is set in `server/.env`.

If that URL points at your main Neon database, then local sign-ins and test saves will still create real app records there.

Recommended setup:

1. In Neon, create a dedicated non-production branch or separate non-production project.
2. Copy that branch or project connection string.
3. Put that non-production connection string in local `server/.env`.
4. Keep the production connection string only in Railway.

Recommended environment split:

```env
# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_ACCESS_WALL_ENABLED=false
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

```env
# server/.env
PORT=4000
DATABASE_URL=postgresql://...your-dev-neon-branch...
ACCESS_WALL_ENABLED=false
CLERK_SECRET_KEY=sk_test_...
```

## Suggested Neon approach

For this project, the easiest path is a dedicated Neon dev branch cloned from your current database. That gives you realistic schema and data while keeping local testing separate from beta signups.

For app traffic, prefer Neon's pooled connection string. For one-off admin tasks or tooling that needs session-level behavior, use a direct connection string instead.

## Before beta testing

Use this split:

- Local dev: Clerk test + dev Neon database
- Beta/staging: Clerk live or beta instance + beta database
- Production: Clerk live + production database

That way:

- your local experiments stay isolated
- beta testers do not mix with your private testing records
- production remains clean
