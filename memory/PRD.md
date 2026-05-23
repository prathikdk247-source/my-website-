# AgroConnect — PRD

## Original Problem Statement
Build AgroConnect — a farmer-first marketplace and community chat. Users register with **Name, Indian phone, Email, Password** and land on a Home page. Top navigation: **Admin · Home · About Us · Seeds/Plants · Fertilizers · Pesticides · Equipment · Chat**. **Fixed admin credentials** unlock an Admin panel where the admin adds AgroShop entries (Name, Category, Contact, Location); each entry appears as a card on the matching category page. A WhatsApp-style **Farmer group chat** allows all registered users to send & delete text messages and images; sender names are displayed automatically.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB), JWT (bcrypt + PyJWT). Single `server.py`.
- **Frontend**: React 19 (CRA + Craco), React Router v7, axios with Authorization Bearer header (token in localStorage).
- **Design**: Earthy / agricultural green palette, Fraunces (display) + Plus Jakarta Sans (sans).

## User Personas
1. **Farmer** — registers, browses AgroShops by category, calls them, chats with peers.
2. **Admin** (fixed creds) — curates AgroShop directory & moderates chat.

## Fixed Admin Credentials
`admin@agroconnect.in / Admin@2026` (role enforced via seed + `require_admin` dep).

## What's Been Implemented (2026-05-23)
- JWT auth with **Indian-phone validation** server- and client-side.
- Admin email is reserved at signup.
- 8 seeded AgroShops (2 per category) + Admin add/delete with admin-only gate.
- Home page (greeting + 4 category cards + admin shortcut), About Us, four category pages (Seeds/Plants, Fertilizers, Pesticides, Equipment) showing shop cards (name, category chip, location, contact, description, Call-now tel link).
- WhatsApp-style Farmer Chat: text + image (≤1 MB base64), delete own/admin-only-others, name & color-coded avatar per sender, 4s polling.
- 28/28 backend pytest + all frontend E2E flows passed (iteration_2).

## Prioritized Backlog
- **P1**: Replace 4s chat polling with WebSocket / SSE for real-time.
- **P2**: Indian-phone validation on AgroShop `contact` field too.
- **P2**: Hamburger / collapsible nav under 1024px width.
- **P2**: Touch-friendly bubble delete (long-press menu).
- **P3**: Pagination on `/api/chat`; lifespan ctx instead of `@app.on_event`.
- **P3**: AI Crop Advisor chatbot (Emergent LLM key).

## Test Credentials
See `/app/memory/test_credentials.md`.
