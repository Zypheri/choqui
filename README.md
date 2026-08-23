# Choqui

A WhatsApp assistant for car accident claims, with a management dashboard for insurers.

When someone gets into a car accident, they message Choqui on WhatsApp. The bot validates the license plate against an active policy, checks whether anyone is hurt, gathers the account of what happened, and guides the user through a single link where they confirm the accident location on a map and upload the required documentation — all in one session, without going back and forth between WhatsApp and the browser. Once done, a web dashboard shows the operator each case already structured, with an automatic fraud risk analysis.

> **Scope:** this is a hackathon demo for a single client ("demo insurer"), with no multi-tenancy. There's no organization-level separation — any authenticated operator can see every claim.

## How it works, end to end

1. **The user messages "I crashed" (or similar) on WhatsApp.**
2. **License plate and policy validation.** The bot asks for the insured's license plate, validates its format (old or Mercosur), and confirms there's an active policy tied to it. If there's no policy, it stops there.
3. **Injuries come first, always.** If anyone is hurt, the bot redirects to emergency services and flags the case for human review — it doesn't continue with the automated checklist.
4. **Accident account.** The bot gathers what happened, how, and when, through a natural conversation, not a form.
5. **One single link for everything else.** Once the account is complete, the bot sends **a single link** to the mini-app. From there, without going back to WhatsApp:
   - The user marks the accident location on a map (draggable pin, centered on their geolocation)
   - They upload, one after another, the 11 required documents (ID, registration, and license for both the insured and the other driver if available, the 4 vehicle views, and the damage) — each photo is taken live with the camera (never from the gallery), geotagged, and hashed to detect duplicates
6. **The mini-app notifies the system on its own once everything is done.** When the checklist is completed, an automatic trigger makes the bot proactively send the user the next WhatsApp message — it doesn't rely on the user typing anything to "announce" they're done.
7. **Automatic fraud analysis.** When the checklist closes, an analysis runs combining explainable rules (unverified photos, inconsistent location, a license plate repeated across claims, duplicate photos, a very new account) with a second AI review, which can adjust the score within a bounded range.
8. **The management dashboard** shows all of this in real time: the claims inbox, the ones that just came in, and a ranking of cases by fraud risk with the detail behind each signal.

## Handling pending claims / grace period

If a user leaves a claim half-finished and comes back later:

- **Under 24h of inactivity:** the bot picks the case back up where it left off, no questions asked.
- **Between 24h and 30 days:** the bot explicitly asks whether they want to continue that case or start a new one, and waits for their answer before proceeding.
- **Over 30 days:** the case is automatically marked as abandoned and a new one starts.

## Architecture

```
WhatsApp (user)
      ↓ ↑
    Twilio
      ↓ ↑
      n8n  ──────────────► OpenAI (text, audio, vision, agent)
  (conversational bot          │
   + mini-app trigger          ▼
   + fraud analysis)       Supabase
      ↓ ↑                  (DB, Storage, Auth, Realtime)
      └──────────────────────► ▲
                                │
                       Next.js (Vercel)
              Management dashboard + capture mini-app
                       (private API route → n8n)
```

- **n8n** hosts three separate workflows:
  - *WhatsApp bot*: receives messages, detects text/audio/image, groups them with a Redis buffer (so it doesn't reply to loose messages from the same burst), resolves license plate/policy validation and the grace period, and uses an AI agent with a scoped tool to guide the conversation and write progress to Supabase.
  - *Mini-app trigger*: a separate webhook the mini-app calls once the checklist is complete. It rebuilds the case context independently (it can't reuse nodes from the bot workflow — each n8n workflow is isolated) and has the agent proactively send the user the next WhatsApp message.
  - *Fraud analysis*: triggered by a Supabase Database Webhook when a claim moves to `generando_resumen`. Combines explicit rules with a second AI opinion, bounded to a ±15-point adjustment.
- **Next.js (this repo)**: the management dashboard and the capture mini-app (map + documentation wizard). It only talks to n8n through a server-side API route (`/api/trigger-paso`), so the webhook URL is never exposed to the browser.
- **Supabase**: database, private photo storage (with signed URLs), operator authentication, and Realtime so the dashboard updates itself.

## Dashboard structure

- **Claims** — every case
- **New Claims** — queue of recently started cases
- **Fraud Diagnostics** — cases with a calculated score, ranked by risk

## Stack

- **n8n** — orchestration for the bot, the mini-app trigger, and the fraud analysis
- **Redis** — message buffering (debounce) and structured wait states (awaiting license plate, awaiting continuation decision)
- **Next.js 14 (App Router) + TypeScript + Tailwind** — dashboard and mini-app
- **Supabase** — Postgres, Auth, Storage, Realtime
- **Twilio** — WhatsApp channel (connected from n8n)
- **OpenAI** — text interpretation, audio transcription, and the AI agents (conversation and fraud review)
- **Vercel** — deployment for the Next.js project

## Running the project locally

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

The bot, the mini-app trigger, and the fraud analysis don't run locally — they're n8n workflows configured directly in its interface, pointing at the same Supabase database.

## Database

The schema lives in `/supabase/schema.sql`. Main tables:

- `usuarios` (users) — whoever reports the claim, identified by phone number
- `polizas` (policies) — license plate + phone + validity, used to validate before creating a claim
- `siniestros` (claims) — the full state of the case: `estado` (status), `hay_heridos` (injuries), `datos_accidente` (account), `datos_otro_conductor` (other driver's info), `ubicacion_reportada_*` (location), `patente_asegurado` (insured's plate), `fraud_score`, `fraud_signals`, `fraud_analisis_ia`, `esperando_decision_continuidad` (awaiting continuation decision)
- `fotos` (photos) — every uploaded document, with `storage_path`, `hash`, `lat`/`lng`, `fuente` (source)
- `operadores` (operators) — dashboard users, authenticated with Supabase Auth

RLS is enabled on every table. Operator policies (`authenticated`) allow viewing/editing everything, with no organization distinction. `anon` policies (used by the mini-app, which has no session) allow reading/writing the minimum needed for the capture flow.

## Security

- This repo **never uses the Supabase `service_role key`** — only the `anon key`, protected by RLS.
- The n8n webhook URL lives in `N8N_WEBHOOK_URL` (a private variable, no `NEXT_PUBLIC_` prefix) and is only used server-side, inside `/api/trigger-paso` — it never reaches the browser.
- The `anon` policies are permissive (`using (true)`) to keep the mini-app's sessionless flow simple. That's acceptable for a demo, **not for real production** — there, this would be solved with signed, single-use tokens per link instead of open access to the tables.
- Twilio, OpenAI, and Supabase credentials used by n8n live in its own credentials system, not in this repo.

## Team

Built for the Aleph Hackathon Rosario by Francisco Buthet, Nicolas Ricobelli and Juan