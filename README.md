# Coy Discover

A mobile-first dating discovery app with per-account PostgreSQL profiles, persistent swipes, mutual matching, chat, and a polished responsive UI.

## Features

- Home, Discover, and Matches tabs
- Email/password sign-up and sign-in with scrypt password hashes and revocable, HTTP-only database sessions
- Account profiles and profile edits stored in PostgreSQL
- Profile photo uploads from JPG, PNG, or WebP files; resized photos are saved with the account profile
- Profile completion indicator and selectable interest tags
- Gender identity and discovery preferences, applied by the feed API; undisclosed identities are not inferred to be non-binary
- 59 seeded demo profiles from Indian cities across multiple gender identities
- Indian-city autocomplete suggestions with custom city support
- Tinder-style drag, like, and pass interactions
- Per-account persistent PostgreSQL swipes, matches, and messages
- Backend-enforced mutual matching
- Incoming-like status is never exposed; compatible demo profiles provide simulated incoming likes so mutual matches can be tested
- New accounts receive a few simulated likes from compatible demo profiles; liking one back creates a demo match
- Animated match celebration, searchable matches, persistent chat, and match removal
- Loading, empty, and retry states

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- Framer Motion and Lucide React
- Prisma ORM and PostgreSQL
- Zod
- Vitest

## Database Schema

- `User`: account email, password hash, and profile information
- `Session`: hashed session token and expiry, linked to one account
- `Swipe`: one swipe per account and target pair
- `Match`: normalized mutual pair with a unique constraint
- `Message`: timestamped chat message associated with a match; deleting a match deletes its messages
- `Swipe.swiperId + Swipe.targetUserId` is unique
- `Match.userOneId + Match.userTwoId` is unique

## API

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/sign-up` | Creates an account, stores its profile and password hash, and starts a session |
| POST | `/api/auth/sign-in` | Verifies the email/password and starts a session |
| GET | `/api/auth/me` | Returns the signed-in account profile |
| POST | `/api/auth/sign-out` | Revokes the current session |
| PATCH | `/api/profile` | Saves profile changes for the signed-in account |
| GET | `/api/feed?limit=50` | Returns profiles matching the account's saved discovery preferences and not previously swiped |
| POST | `/api/swipe` | Saves `{ "targetUserId": "user_01", "action": "LIKE" }` or `PASS` |
| GET | `/api/matches` | Returns the signed-in account's confirmed mutual matches |
| DELETE | `/api/matches/:matchId` | Removes a match involving the signed-in account and its conversation |
| GET | `/api/matches/:matchId/messages` | Loads a conversation involving the signed-in account |
| POST | `/api/matches/:matchId/messages` | Sends `{ "text": "Hello!" }` (up to 1000 characters) to a confirmed match |
| POST | `/api/swipes/reset` | Clears the signed-in account's outgoing swipes |

## Setup

Create a PostgreSQL database and set its connection URL as `DATABASE_URL` in `.env` before running Prisma commands. You can start from `.env.example`.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

For example, hosted PostgreSQL databases are available from Neon and Railway. A connection URL looks like:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

For production, set `DATABASE_URL` in the hosting provider and run `npm run db:deploy` to apply committed migrations. Seed demo discovery profiles with `npm run db:seed`; rerunning it safely adds demo incoming likes for existing accounts. New accounts receive them automatically. Do not run the seed on every server start.

## Deploy to Vercel

1. Push the project to a GitHub repository. Include the current source, `package.json`, lockfile, and `prisma/migrations`; do not commit `.env`.
2. In Vercel, import the repository as a new project. Keep the detected Next.js framework, root directory, install command, and build command (`npm run build`) unchanged.
3. Add `DATABASE_URL` under the Vercel project's **Production** environment variables, using the connection string from Neon. Do not paste it into source files or chat. For Preview deployments, use a separate Neon branch/database rather than the production database.
4. Confirm the Neon schema is migrated before deploying. Run `npm run db:deploy` locally with the production database URL, then run `npm run db:seed` once if demo profiles have not already been seeded.
5. Deploy from Vercel, open the assigned HTTPS URL, and test account sign-in, discovery, a demo match, chat, and sign-out. Redeploy after changing environment variables.

The build command runs `prisma generate` before `next build`; Vercel does not need a custom server command. The existing Neon database and demo profiles remain persistent across deployments.

## Tests

Tests need a separate, disposable PostgreSQL database whose name contains `test`; the test setup refuses other database names and prepares that database with Prisma:

```powershell
$env:TEST_DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/coy_test?schema=public"
npm test
```

Account passwords are hashed with scrypt and never returned to the browser. Authentication uses a random session token in an HTTP-only cookie; only its hash is stored in the database. Profiles, discovery preferences, swipes, matches, and messages are account-scoped. Uploaded profile images are currently stored as resized data URLs in PostgreSQL, which is suitable for a small demo; production-scale image hosting should use object storage. Email verification, password recovery, and a privacy-policy/consent flow still need to be added before treating this as a production dating service.

The PostgreSQL baseline is a fresh database setup. Existing SQLite records and browser-local demo profiles are not automatically copied; back up any data you need and create an account on the new database.
