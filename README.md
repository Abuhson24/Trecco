# Trecco

Cooperative management platform — savings, loans, inventory, and a produce marketplace,
built for agribusiness cooperatives first, open to any cooperative type across Africa.

## Stack

| Layer     | Choice                                              |
|-----------|------------------------------------------------------|
| Web       | Next.js (TypeScript, App Router)                     |
| Mobile    | React Native (Expo)                                   |
| API       | NestJS (TypeScript)                                    |
| Database  | PostgreSQL (via Prisma ORM)                             |
| Banking   | Providus Bank (dedicated virtual accounts, NIP transfer, webhooks) |
| Hosting   | AWS — Amplify (web), ECS Fargate (API), RDS (Postgres) |
| Auth      | JWT (access + refresh), bcrypt password hashing         |

## Monorepo layout

```
trecco/
  apps/
    web/            Next.js admin + member web app
    mobile/         React Native (Expo) member app
    api/            NestJS backend — single API serving both clients
  packages/
    shared-types/   TypeScript types shared across web, mobile, and api
  infra/
    docker-compose.yml   local Postgres for development
```

Web and mobile don't share UI code (React Native and React DOM render differently),
but they **do** share `packages/shared-types` — every model (Member, Account, Loan,
MarketplaceDemand, etc.) is defined once and imported by both, so the two clients can
never drift out of sync with what the API actually returns.

## Core domain model — read this before touching the database

The most important architectural decision, carried over from the design phase:

- Every member has **two balances**: a `PersonalAccount` (real money, backed by a
  Providus dedicated virtual account) and their share of a `CooperativeAccount`
  (the coop's own pooled account).
- "Contributing" is a real `Transaction` moving money from a member's personal
  account into the cooperative account — never just a number edited on a dashboard.
- Loan disbursement and loan repayment **both write to the same personal account
  ledger** used for funding and withdrawal. Do not create a separate "loan wallet."
  See `prisma/schema.prisma` — `Transaction.type` distinguishes these events, but
  they all resolve against `PersonalAccount.balance`.
- Manual loan repayments (member uploads a receipt) must NOT reduce the outstanding
  loan balance until an admin confirms it against the coop account's actual bank
  inflow. This is modeled as `LoanRepayment.status: PENDING | CONFIRMED | REJECTED`,
  and only `CONFIRMED` rows count toward `Loan.amountRepaid`.

## What's stubbed vs. what needs Providus's docs

Everything in `apps/api/src/modules/wallet` and `loans` that touches Providus is a
stub with a `// TODO(providus):` comment. Once you share the API docs, the actual
integration points are:

1. **Create dedicated virtual account** — called on member signup (`auth` module,
   `onSignupComplete` hook → `wallet.provisionAccount(memberId)`).
2. **Webhook receiver** — `POST /webhooks/providus` — must verify signature, then
   credit `PersonalAccount.balance` and write a `Transaction` row. This is the one
   endpoint that has to be rock solid; every funding and repayment screen depends on it.
3. **Outbound transfer** — used for withdrawals and loan disbursement.

## ATM cards — request, admin approval, fee, delivery (`apps/api/src/modules/cards`)

Follows the exact same pattern as `wallet`: internal state-machine logic (request,
approve, reject, dispatch, deliver) is fully implemented against Prisma; anything
that calls out to Xpress Wallet (`https://payment.xpress-wallet.com/api/v1`) is a
stub in `cards/xpress-wallet.client.ts` with a `// TODO(xpress-wallet):` comment,
same convention as the Providus stubs above.

Flow: member submits `POST /cards/request` (`VIRTUAL` or `PHYSICAL` — physical
requires a delivery address, captured once and never editable) → sits at
`PENDING_APPROVAL` → admin calls `POST /cards/admin/requests/:id/approve`, which
in one DB transaction debits the fee from `PersonalAccount`, credits
`CooperativeAccount`, writes a `CARD_ISSUANCE_FEE` Transaction, then calls Xpress
Wallet to actually mint the card → `ISSUED` → for physical cards, admin marks
`dispatch` (courier + tracking ref) then `delivered`.

Card fees are flat env vars (`CARD_FEE_VIRTUAL`, `CARD_FEE_PHYSICAL`) for now —
same "open decision" status as the withdrawal fee below. `PrismaService` (new,
`apps/api/src/prisma/`) is now the one shared DB client every module should
inject — the scaffold didn't have one wired up before this.

Admin approval/dispatch UI is web-only (`apps/web/app/admin/cards`); the member
request flow exists on both web (`apps/web/app/cards`) and mobile
(`apps/mobile/screens/CardsScreen.tsx`, reached from the Wallet tab).

## Mobile: Android + iOS from one codebase

`apps/mobile` is Expo/React Native — `CardsScreen.tsx` and everything else in
`apps/mobile` is not Android-specific, the same JS runs on both platforms.
Added `app.json` (bundle identifiers, icons, splash — none of this existed in
the scaffold) and `eas.json` (EAS Build profiles). Android can be built and
run entirely on Ubuntu; iOS cannot be compiled on Linux (Apple requires Xcode,
macOS-only) — use EAS Build's cloud Mac workers instead, see root README's
local development section for the exact commands.

## Local development

```bash
cp .env.example .env          # fill in DB + JWT secret; Providus keys once shared
docker compose -f infra/docker-compose.yml up -d
cd apps/api && npm install && npx prisma migrate dev && npm run start:dev
cd apps/web && npm install && npm run dev
cd apps/mobile && npm install && npx expo start
```

## Next steps

1. Share the Providus API docs — unblocks `wallet` and `loans` modules.
2. Share the Xpress Wallet API docs — unblocks `cards` issuance
   (`apps/api/src/modules/cards/xpress-wallet.client.ts`).
3. Decide: withdrawal fee flat or percentage, absorbed by Trecco or passed to member
   (flagged as open question in the money-flow spec — needed before building `withdrawal`).
4. Auth module (`apps/api/src/modules/auth`) is still fully stubbed — JWT strategy,
   guards, and `req.user` don't exist yet. Every other module (`wallet`, `cards`, etc.)
   assumes `req.user.memberId` / `req.user.role` once auth lands; the inline
   `assertAdmin()` check in `cards.controller.ts` is a placeholder for a real
   `RolesGuard` and should be replaced once auth is built.
5. This project no longer has Bryan/Christabel on it — solo-maintained going forward.
   Build module-by-module the same way `cards` was added: real Prisma-backed logic for
   anything that's pure internal state, `// TODO(provider):`-stubbed methods, isolated
   in one client file, for anything that needs a third-party API's docs.
