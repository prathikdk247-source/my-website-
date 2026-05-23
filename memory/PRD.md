# AgroConnect — PRD

## Original Problem Statement
AgroConnect — Farmer Network & Marketplace.
User asked to recreate the website at https://farmer-network-1.preview.emergentagent.com/register.

Reference description: "AgroConnect — a farmer-first marketplace and community chat for seeds, fertilizers, pesticides and farm equipment."

## Architecture
- **Backend:** FastAPI (Python) + Motor (MongoDB), JWT auth (bcrypt + PyJWT), single `server.py`.
- **Frontend:** React 19 (CRA + Craco), React Router v7, axios with Authorization Bearer header (token in localStorage).
- **Design:** Earthy / agricultural green palette, Fraunces display + Plus Jakarta Sans sans-serif.

## User Personas
1. **Farmer** — lists produce/inputs, posts updates, replies to buyers.
2. **Buyer** — searches marketplace, contacts sellers, joins community.

## Core Requirements
- Email/password auth with two roles: farmer, buyer.
- Marketplace listings across 4 categories: seeds, fertilizers, pesticides, equipment. Search + filter + create + delete (owner).
- Community feed: post / like / comment / delete.
- Direct messages between any two users; conversation list + thread view.
- Profile: view + edit name/phone/location/bio; see own listings.

## What's Been Implemented (2026-05-23)
- JWT auth with two seeded demo users (farmer + buyer).
- Full marketplace CRUD with category & search filters and 6 seeded listings.
- Community feed with seeded posts, likes, comments, delete.
- Direct messages: send, list conversations, view thread, auto-create when contacting from listing.
- Profile view + edit, with own listings.
- Split-screen auth pages (matching reference design), top-bar nav for the app shell.
- 21/21 backend tests and 11/11 E2E UI flows passed (testing_agent iteration_1).

## Prioritized Backlog
- **P1:** Loading skeletons on Feed/Marketplace to avoid empty-state flash.
- **P1:** Escape regex in `q` search param (`re.escape`) to prevent ReDoS on special chars.
- **P2:** Pagination on listings / posts.
- **P2:** Image upload for listings & posts (currently none).
- **P2:** AI crop advisor chatbot using Emergent LLM key.
- **P2:** Real-time messaging (WebSocket) — currently polling-on-action.
- **P3:** Migrate from `@app.on_event` to FastAPI lifespan context.
- **P3:** Add positive-number validation on listing price/quantity.

## Test Credentials
See `/app/memory/test_credentials.md`.
