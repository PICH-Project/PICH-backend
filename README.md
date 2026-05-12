# PICH — Backend

API server for **PICH**, a Solana-native digital business card app. Built during the Colosseum hackathon.

The mobile client lives in a separate repo — see [Related repos](#related-repos) below.

---

## What PICH is

A mobile-first replacement for paper business cards. Users create personal (PAC), business (BAC), or VIP (VIPAC) cards, exchange them with one QR scan, pay for premium tiers in crypto on **Solana mainnet**, and can donate to Ukrainian charities through a privacy-preserving flow.

This repo hosts the NestJS backend that powers the mobile app: auth, subscriptions, payments, card storage, image uploads, and the Solana transaction builders.

---

## Solana integrations

Three production Solana paths live in this codebase, all running on **mainnet**:

### 1. KiraPay — subscription payments
`src/payments/`

- `POST /payments/checkout` builds a KiraPay payment link with `tokenOut: { chainId: 'sol', address: 'SOL' }` so settlement is always native SOL on the merchant wallet.
- `POST /payments/webhook` processes KiraPay events and activates the corresponding subscription.
- Verbose webhook logs include sender/receiver breakdown, the Solscan tx link, and parsed `customOrderId` — on-chain verification is one click away during the demo.

### 2. Umbra Privacy — donations
`src/umbra/`, `src/donation/`

- `POST /donations/prepare` returns an unsigned Umbra shielded-deposit transaction for a chosen charity.
- We use a custom `PrepareOnlySigner` that intercepts the SDK's `signTransaction` call, encodes the half-built tx to base64, and ships it to mobile. Mobile signs via Mobile Wallet Adapter and submits to mainnet itself.
- Amounts are encrypted on-chain through Umbra's zero-knowledge proofs — no observer on Solscan can link sender, recipient, or amount.
- Charity list is hardcoded in `src/donation/charities.constant.ts` (Come Back Alive, UNICEF Ukraine, Prytula Foundation, UNBROKEN).

### 3. Subscription model with on-chain pricing
`src/subscriptions/`

- Multi-tier plans: `FREE / PREMIUM (addon) / BUSINESS / VIP`. PRIMARY + ADDON stacking; VIP includes premium perks.
- Plan-gated features enforced server-side in `cards.service.checkSubscriptionLimits` and `checkCustomizationAccess`. Frontend gates are UX only — backend is source of truth.

---

## Stack

- **NestJS 11** + **TypeORM** + **PostgreSQL** (via Docker Compose)
- **@umbra-privacy/sdk** + **@solana/kit** for the Umbra deposit flow
- **@privy-io/server-auth** for JWT verification of Privy-issued tokens (Google OAuth on mobile)
- **@supabase/supabase-js** + **multer** for avatar / card photo uploads
- **TypeORM `synchronize: true`** during dev — schema auto-syncs, no migration step needed

---

## Quick start

```bash
# 1. Configure env (see Required env vars below)
cp .env.example .env

# 2. Boot Postgres + API in Docker
docker compose up -d

# 3. Install deps inside the running container
docker compose exec api yarn install

# 4. Seed subscription plans
docker compose exec api yarn seed
```

API listens on **port 3003**. To expose it to a real mobile device:

```bash
ngrok http 3003
```

### Required env vars

```env
# DB
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=pich
DB_SYNCHRONIZE=true

# Auth
PRIVY_APP_ID=...
PRIVY_API_KEY=...

# KiraPay (Solana mainnet subscriptions)
KIRAPAY_API_KEY=kp_...
MERCHANT_WALLET_ADDRESS=<your-solana-base58-merchant-wallet>

# Umbra (private donations)
UMBRA_NETWORK=mainnet
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com (optional override)

# Supabase Storage (avatars + card photos)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJ...

# Misc
PORT=3003
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## Architecture

```
src/
├─ auth/             Privy JWT verification + JwtAuthGuard
├─ users/            User entity
├─ cards/            Card entity, CRUD, plan-aware validation
├─ connections/      Card-to-card exchange (QR scan flow)
├─ subscriptions/    Multi-tier plan engine, PRIMARY+ADDON stacking
├─ payments/         KiraPay integration: checkout creation + webhook handler
├─ donation/         Umbra-powered private donations + charity list
├─ umbra/            Umbra SDK wrapper with PrepareOnlySigner hack
└─ files/            Supabase upload proxy
```

### Key endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/payments/checkout` | Create KiraPay checkout link for a subscription |
| `POST` | `/payments/webhook` | KiraPay webhook receiver — activates subscription |
| `GET` | `/donations/charities` | List of Ukrainian charity orgs (hardcoded) |
| `POST` | `/donations/prepare` | Build unsigned Umbra shielded-deposit tx |
| `POST` | `/upload/image` | Multipart image upload to Supabase Storage |
| `GET` | `/subscriptions/all` | User's active subscriptions (primary + addon) |
| `POST` | `/subscriptions/checkout` | Create checkout via KiraPay |
| `POST` | `/cards` | Create card (plan-gated by `checkSubscriptionLimits`) |
| `GET` | `/cards` | Fetch user's cards |
| `POST` | `/connections` | Connect two cards (QR scan) |
| `GET` | `/connections/cards` | Fetch cards added via scan from other users |

---

## Prioritization during the hackathon

1. **Core CRUD** — User, Card, Connection entities + Privy OAuth auth
2. **Card exchange** — QR generation + scan flow, Connection model with notes/favorites
3. **Subscription engine** — multi-tier with PRIMARY + ADDON stacking, plan-gated card creation
4. **KiraPay integration** — first Solana piece; gateway chosen for cross-chain support
5. **Umbra donations** — second Solana piece; private donations to Ukrainian charities
6. **Customization** — Premium fonts + VIP avatar frames, server-validated
7. **Supabase uploads** — avatars + card photos, JWT-protected endpoint
8. **Charity cards UI tab** + Solscan verification links — wrapped up for demo

---

## Related repos

- **[PICH-frontend (React Native + Expo)](https://github.com/PICH-Project/PICH-frontend)** — the iOS/Android client that consumes this API.

---

## Team

- **Volodymyr Havryliuk** — mobile app + integrations
- **Kateryna [TODO: surname]** — backend & Umbra deposit-builder

Built for the **Colosseum** Solana hackathon.
