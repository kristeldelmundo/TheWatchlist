# 🍿 CinePop

Pop something on tonight — your shared movie night app. Add movies & TV shows, let the randomizer pick what to watch, then rate and share together.

## ✨ Features

- **Shared Watchlist** — Everyone adds movies and TV shows, auto-fetches poster + plot from OMDB
- **CinePop Picker** — Spin to pick tonight's watch, filter by type or who added it
- **Rate & Share** — Individual star ratings and thoughts, fun reactions, shareable movie card
- **Past Reviews** — Browse all your past movie nights together

## 🛠 Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres database)
- **OMDB API** (movie/show metadata)
- **Vercel** (deployment)

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/kristeldelmundo/TheWatchlist.git
cd TheWatchlist
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_key
OMDB_API_KEY=your_omdb_key
```

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

made with ♥ for movie nights 🍿
