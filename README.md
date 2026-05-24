# 🏆 DRHV Premier League - Premium Cricket Portal

A state-of-the-art, real-time cricket tournament management portal designed for local housing societies and amateur tournaments. This platform features a high-fidelity live scoring dashboard for match officials, comprehensive statistics hubs for viewers, and **three revolutionary AI-driven features powered by Google Gemini 1.5 Flash**.

Deployed and fully operational at production grade using **React, Vite, Supabase Realtime, and Vercel**.

---

## 🚀 Key AI Features (Powered by Google Gemini 1.5 Flash)

This project integrates Generative AI directly into the browser client, leveraging the stable production **Google Gemini `v1` REST API** to deliver instantaneous, context-aware insights without heavy backend wrappers.

### 1. 🎙️ Live Voice & Text AI Commentator
* **Where to find**: Live commentary screen during an active match.
* **How it works**: Blends browser-native Web Speech API synthesis with custom prompts. When a delivery is completed (e.g., a massive six or a dramatic run-out), the system translates the batsman, bowler, and run events into high-energy, charismatic live audio narration resembling professional television broadcasters! Fans can also click **"Ask AI Commentator"** on any ball to generate unique, thrilling textual narration.

### 2. 📰 AI Match News Flash & Editorial Writer
* **Where to find**: The **🤖 AI Match News** tab on any match details page.
* **How it works**: Fully integrates scorecard databases and dynamic partnership logs. Upon clicking **"Draft Match Summary"**, Gemini synthesizes the innings totals, strike rates, partnership curves, and bowling margins into a dramatic, highly engaging newspaper-style sports column, complete with key strategic takeaways!

### 3. 📈 AI Player Scouting & Performance Coaching
* **Where to find**: Clicking on any player profile page.
* **How it works**: Compiles historical batting logs, bowling logs, high scores, strike rates, and recent match forms. Clicking **"Analyze Player Performance"** compiles these stats into an elite scouting card displaying a motivational tagline, key statistical strengths, actionable improvement points, and professional tactical recommendations.

---

## 🎨 Premium UI & Formatting Engineering

* **Custom Inline Markdown Parser**: Developed a lightweight, highly performant React-native tokenizing engine (`parseInlineMarkdown`) that automatically renders Google Gemini's raw markdown formatting (such as `**bold text**` and `*italic text*`) into beautiful, type-safe HTML tags (`<strong>` and `<em>`).
* **On-Demand & Regeneration Triggers**: Implemented Call-To-Action buttons and browser-level `localStorage` caching to minimize duplicate API network calls, prevent quota exhaustion, and let users **regenerate or refresh** reports on-demand at any time.

---

## 💻 Technology Stack

* **Core Frontend**: React 19, Vite (Lightning-fast HMR), Tailwind CSS (sleek, high-fidelity dark glassmorphic styling), Lucide Icons
* **Charts & Analytics**: Recharts (smooth, interactive line and bar graphs)
* **Backend Database & Realtime Replication**: Supabase (PostgreSQL with active Realtime Websocket listener channels for immediate scoreboard syncing)
* **Generative AI Platform**: Google AI Studio REST API (`gemini-1.5-flash` via stable `/v1` endpoint)
* **Hosting**: Vercel (Production bundles compiling with exit code `0`)

---

## 📁 Repository Directory Structure

```text
DRHV_Cricket/
├── src/
│   ├── components/      # Reusable UI elements, Spinner, ProtectedRoute, ScorerLayout
│   ├── lib/             # API connections (supabase.js, gemini.js with diagnostic system)
│   ├── pages/
│   │   ├── admin/       # League management dashboards (Teams, Players, Schedule)
│   │   ├── scorer/      # Interactive LiveScoring scoreboard interface
│   │   └── viewer/      # Match Center, Player Profiles, Live Commentary panels
│   ├── store/           # Zustand state managers (auth, scoring, live scores)
│   ├── index.css        # Custom global CSS theme variables
│   └── main.jsx         # React application bootstrap
├── public/              # Static logo assets and icons
├── vercel.json          # SPA routing rewrite configurations
├── tailwind.config.js   # Custom Tailwind design utility layout tokens
└── vite.config.js       # Vite bundle build compiler configurations
```

---

## 🛠️ Local Installation & Setup

Follow these simple steps to run this portal locally in under 3 minutes:

### 1. Clone the Repository & Install Dependencies
```bash
git clone https://github.com/NisargPatel03/DRHV_Cricket_Tournament.git
cd DRHV_Cricket_Tournament
npm install
```

### 2. Configure Environment Variables
Create a file named `.env` in the root directory of your project:
```env
VITE_SUPABASE_URL=https://vlvxhfzrpfjqrlksimdr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSy...
```

### 3. Launch Development Server
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## 🔒 Vercel Deployment & SPA Routing

When deploying to Vercel, two configuration steps are highly critical:

### 1. Vercel Environment Variables
You must add the three keys from your local `.env` file to your **Vercel Project Settings → Environment Variables**:
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `VITE_GEMINI_API_KEY`

### 2. Deep-Link Routing (`vercel.json`)
Since this is a Single Page Application (SPA) using HTML5 History API routing, refreshing pages like `/match/:id` or `/player/:id` will throw a Vercel 404 error by default. 
To bypass this, our repository includes a preconfigured `vercel.json` file that instructs Vercel to route all URL subpaths back to the compiled `/index.html` file, letting React Router parse the route successfully:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*(Redeploying the project after adding this file fully resolves all browser refresh routing issues!)*
