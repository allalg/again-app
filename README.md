# STREAKPACT 🔥

> **A Social Accountability Challenge Platform**  
> Form 90-day pacts with friends. Submit daily photographic evidence. Track progress with verifiable streaks. Hold each other financially accountable with automated penalty tracking.

---

## 🌟 Features

### 1. Daily Accountability Challenges
- **Configurable Pacts**: Default 90 days or custom duration (7, 14, 30, 60, 90, 100 days).
- **Multiple Challenge Types**: Duration (e.g. 45 min workout), Distance (e.g. 5 km run), Count (e.g. 100 pushups), Pages (e.g. 20 pages reading), or Custom target.
- **Rule Freezing & Versioning**: Challenge rules are locked once started; amendments require unanimous peer consent.
- **Custom Deadlines & Timezones**: Daily deadlines are evaluated precisely per challenge timezone with grace periods.

### 2. Proof Submission & Peer Verification
- **Drag-and-Drop Photo Uploads**: Client-side validation (JPEG, PNG, WebP, HEIC up to 10MB) with auto-resizing.
- **Direct-to-Storage Uploads**: Secure uploads to private Supabase storage with signed access URLs.
- **Peer Review & Disputes**: Challenge members can review submissions, flag suspicious entries, or vote on disputes.

### 3. Financial Penalty & Settlement Ledger
- **Stakes & Missed Days**: Configurable penalty amounts per missed day.
- **Automatic Allocation**: Unmet targets automatically calculate and distribute penalties among compliant members or designated pools.
- **Transparent Ledger**: Two-way confirmed settlement tracking (Cash, Venmo, Zelle, PayPal, UPI, Bank Transfer) with receipt notes.

### 4. Social & Realtime Engagement
- **Challenge Group Chat**: Realtime messaging with image attachments, emoji reactions, and system milestones.
- **Friendships & Invites**: Shareable tokenized invite links, QR codes, and friend request system.
- **Competitive Leaderboards**: Streak lengths, completion percentages, total active days, and trophies.

### 5. Progressive Web App (PWA) & Notifications
- **Installable**: Full PWA manifest with responsive mobile-first navigation and offline caching via Service Worker.
- **Push & In-App Alerts**: Web Push API notifications for upcoming deadlines, peer submissions, chat messages, and penalty notifications.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State & Cache** | TanStack Query v5, Zustand |
| **Backend & DB** | Supabase (PostgreSQL 15, Auth PKCE, Realtime, Storage) |
| **Serverless / Cron** | Supabase Edge Functions (Deno / TypeScript) |
| **Testing** | Vitest, Testing Library, jsdom |
| **Hosting** | Vercel (SPA routing, security headers) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd "90days challenge"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Apply Database Migrations
Run the SQL migrations in your Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` — Core tables, Enums, RLS policies, triggers.
2. `supabase/migrations/002_helpers_and_storage.sql` — RPC helper functions, storage bucket definitions, and performance indexes.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Build

### Run Type Checking
```bash
npm run type-check
```

### Run Unit Tests
```bash
npm run test -- run
```

### Production Build
```bash
npm run build
```
Build outputs are generated in the `dist/` directory.

---

## 🚢 Deployment

### Vercel Deployment
The repository includes a ready-to-deploy `vercel.json` with client-side SPA rewrites, Service Worker headers, and security headers:
1. Push your repository to GitHub or GitLab.
2. Import the project into Vercel.
3. Set the Framework Preset to **Vite**.
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (optional for Web Push)
5. Deploy!

### Supabase Edge Functions
Deploy the serverless cron functions using the Supabase CLI:
```bash
# Login to Supabase
supabase login

# Deploy Edge Functions
supabase functions deploy evaluate-daily-deadlines
supabase functions deploy send-deadline-reminders

# Set Edge Function Secrets
supabase secrets set APP_URL=https://your-domain.vercel.app
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
```

---

## 🔒 Security & Privacy
- **Row-Level Security (RLS)**: Enforced across all PostgreSQL tables. Users can only read and mutate data they own or share via an active challenge membership.
- **Private Storage**: Proof submissions are stored in private buckets and rendered through temporary signed URLs.
- **Audit Trails**: Critical events (penalty creations, rule modifications, payment confirmations) are permanently recorded in `audit_logs`.
