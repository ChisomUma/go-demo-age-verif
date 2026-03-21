# GBG GO — Age & Identity Verification Frontend

A Next.js 15 frontend that integrates with the **GBG GO Journey API v2** to collect identity data through a dynamic, multi-step verification form. The form structure is driven entirely by the interaction response from the API — if the journey design changes in GBG GO Designer, this frontend adapts automatically.

---

## How it works

This app follows the **API-first execution flow** defined by GBG GO v2:

```
Your Frontend              Next.js API Routes              GBG GO Platform
     │                           │                                │
     │  1. Click "Begin"         │                                │
     │ ────────────────────────> │  POST /journey/start           │
     │                           │ ─────────────────────────────> │
     │                           │     ← { instanceId }           │
     │                           │                                │
     │  2. Poll for interaction  │  POST /journey/interaction/    │
     │ ────────────────────────> │       fetch                    │
     │                           │ ─────────────────────────────> │
     │     ← { pages, cards,    │                                │
     │        collects,          │                                │
     │        outstanding }      │                                │
     │                           │                                │
     │  3. User fills out form   │                                │
     │     (multi-step pages)    │                                │
     │                           │                                │
     │  4. Submit all data       │  POST /journey/interaction/    │
     │ ────────────────────────> │       submit                   │
     │                           │ ─────────────────────────────> │
     │                           │     ← { status: "success" }    │
     │                           │                                │
     │  5. Poll journey state    │  POST /journey/state/fetch     │
     │ ────────────────────────> │ ─────────────────────────────> │
     │     ← { status:           │                                │
     │        "Completed" }      │                                │
```

The Next.js API routes act as a **server-side proxy** — your GBG credentials never leave the server.

---

## Architecture

```
src/
├── app/
│   ├── api/                          # Server-side API proxy routes
│   │   ├── auth/route.ts             # PingFederate token retrieval + caching
│   │   └── journey/
│   │       ├── start/route.ts        # POST /journey/start
│   │       ├── fetch/route.ts        # POST /journey/interaction/fetch
│   │       ├── submit/route.ts       # POST /journey/interaction/submit
│   │       └── state/route.ts        # POST /journey/state/fetch
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page (renders VerificationForm)
│   └── globals.css                   # Tailwind + custom component styles
│
├── components/
│   ├── VerificationForm.tsx          # Main orchestrator (lifecycle + state)
│   ├── StepIndicator.tsx             # Progress stepper
│   ├── CardRenderer.tsx              # Dynamic card → component mapper
│   └── cards/
│       ├── NameCard.tsx              # Collects FullName domain element
│       ├── DateOfBirthCard.tsx       # Collects DateOfBirth domain element
│       ├── EmailCard.tsx             # Collects PersonalEmail domain element
│       ├── PhoneCard.tsx             # Collects MobilePhone domain element
│       ├── AddressCard.tsx           # Collects CurrentAddress domain element
│       └── index.ts                  # Barrel export
│
└── lib/
    ├── types.ts                      # TypeScript interfaces for v2 API shapes
    ├── api.ts                        # Client-side fetch helpers + polling
    ├── domain-mapper.ts              # Converts form data → v2 context.subject schema
    └── validation.ts                 # Per-page field validation
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| **Server-side API proxy** | GBG credentials (client_id, client_secret, username, password) stay on the server. The browser never sees them. |
| **Dynamic card rendering** | `CardRenderer` maps card IDs from the interaction response to React components. If a journey adds new cards, you add the matching component — the rest adapts. |
| **Domain element mapping** | `domain-mapper.ts` converts flat form state to the canonical `context.subject` structure that the v2 API expects. Each domain element has a fixed schema path (e.g., `FullName` → `subject.identity.{firstName, lastNames[]}`). |
| **Polling with backoff** | After journey start, the app polls `/interaction/fetch` until an interaction appears. After submit, it polls `/state/fetch` until the journey completes. |

---

## Setup — step by step

### Prerequisites

- **Node.js 18+** (v22 recommended)
- **npm** (comes with Node.js)
- A GBG GO account with API credentials and at least one published journey

### Step 1: Clone or download the project

If you received this as a zip file, extract it. Otherwise:

```bash
mkdir gbg-age-verify
cd gbg-age-verify
# Copy all project files here
```

### Step 2: Install dependencies

```bash
npm install
```

This installs Next.js 15, React 19, Tailwind CSS 3, and all other packages.

### Step 3: Configure environment variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` in a text editor and fill in your values:

```env
# Pick the base URL for your region:
#   EU: https://eu.platform.go.gbgplc.com/v2/captain
#   US: https://us.platform.go.gbgplc.com/v2/captain
#   AU: https://au.platform.go.gbgplc.com/v2/captain
GBG_API_BASE_URL=https://eu.platform.go.gbgplc.com/v2/captain

# Your PingFederate token endpoint
GBG_PING_URL=https://your-ping-instance.gbgplc.com/as/token.oauth2

# OAuth 2.0 credentials
GBG_CLIENT_ID=your_client_id
GBG_CLIENT_SECRET=your_client_secret
GBG_USERNAME=your_username
GBG_PASSWORD=your_password

# Your journey resource ID (from GBG GO Designer)
GBG_JOURNEY_RESOURCE_ID=abc123def456...@latest
```

**Where to find these values:**

| Value | Where to find it |
|-------|-----------------|
| `GBG_API_BASE_URL` | Depends on your region. Ask your GBG account manager. |
| `GBG_PING_URL` | Your PingFederate instance URL. This was provided when your GBG GO account was set up. |
| `GBG_CLIENT_ID` / `GBG_CLIENT_SECRET` | API credentials page in GBG GO, or provided by your admin. |
| `GBG_USERNAME` / `GBG_PASSWORD` | Your GBG GO login credentials (for the resource owner password grant). |
| `GBG_JOURNEY_RESOURCE_ID` | In GBG GO Designer, open your journey → look at the URL or the journey settings for the resource ID hash. Append `@latest` to always use the latest published version. |

### Step 4: Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the verification form.

### Step 5: Test the flow

1. Click **Begin verification**.
2. Fill out each step (Personal details → Contact details → Address details).
3. Click **Submit** on the last step.
4. Watch the loading state as the platform processes your data.
5. See the result (Completed / Failed / Still processing).

---

## How the dynamic form works

The form structure comes entirely from the `/interaction/fetch` response. Here is the mapping:

### Interaction response → Form structure

```
interaction.resource.data.pages[]     →  Steps in the stepper
  └── page.cards[]                    →  Form fields on that step
       └── card.id                    →  CardRenderer picks the component
```

### Card ID → Domain element → Schema path

| Card ID | Domain Element | Schema Path |
|---------|---------------|-------------|
| `NameCard` | `FullName` | `subject.identity.{firstName, lastNames[], middleNames[]}` |
| `DateOfBirthCard` | `DateOfBirth` | `subject.identity.dateOfBirth` |
| `EmailCardPersonalEmail` | `PersonalEmail` | `subject.identity.emails[{type:"personal"}]` |
| `PhoneCardMobilePhone` | `MobilePhone` | `subject.identity.phones[{type:"mobile"}]` |
| `AddressCard` | `CurrentAddress` | `subject.identity.currentAddress` |
| `ControlCard` | *(none)* | Navigation only — skipped in rendering |

### Adding support for new cards

If your journey uses a card this frontend does not yet handle (e.g., `DocumentCard` for PrimaryDocument):

1. Create a new component in `src/components/cards/` (e.g., `DocumentCard.tsx`).
2. Add a `case` for it in `src/components/CardRenderer.tsx`.
3. Add the domain element mapping in `src/lib/domain-mapper.ts`.
4. Add form fields to `FormData` in `src/lib/types.ts`.
5. Add validation rules in `src/lib/validation.ts`.

---

## Deployment

### Build for production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npx vercel
```

Set the same environment variables in Vercel's project settings (Settings → Environment Variables).

### Deploy anywhere else

This is a standard Next.js app. It works on any platform that supports Node.js: AWS, GCP, Azure, Railway, Render, etc. Just make sure the environment variables are set.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Authentication failed: 401" | Wrong GBG credentials | Double-check `GBG_CLIENT_ID`, `GBG_CLIENT_SECRET`, `GBG_USERNAME`, `GBG_PASSWORD` in `.env.local` |
| "Resource not found: 404" | Invalid journey resource ID | Verify `GBG_JOURNEY_RESOURCE_ID` matches your published journey |
| "Polling timed out" | Journey is still processing | Backend modules may be slow. Increase the timeout in `src/lib/api.ts` |
| Unknown card type warning | Journey uses a card not yet implemented | Follow "Adding support for new cards" above |
| Form shows no pages | Interaction fetch returned empty | Check that the journey is published and has interactions configured |
