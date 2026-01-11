# غرفة العشاق (Lovers' Room) 💕

A romantic couples Q&A web app built with Next.js, Tailwind CSS, and Supabase.

## Features

- 🔐 **Secure Authentication**: Email login via Supabase Auth.
- 🏠 **Private Room**: A shared space for the couple.
- 💌 **Q&A System**: Ask questions, receive them in your inbox, and reply.
- 📜 **Shared History**: A timeline of your conversations.
- ⚡ **Realtime Updates**: Instant notifications without refreshing.
- 🎨 **Romantic UI**: Soft colors, animations, and elegant typography (Tajawal).

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, Realtime)
- Framer Motion (Animations)
- Lucide React (Icons)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to **Project Settings > API** and copy the `URL` and `anon public` key.

### 2. Database Setup

1. Go to **SQL Editor** in your Supabase dashboard.
2. Copy the content of `schema.sql` (included in this project) and run it.
   - This will create the tables (`rooms`, `members`, `questions`, `answers`) and set up Row Level Security (RLS) policies.

### 3. Environment Variables

1. Rename `.env.local.example` to `.env.local`.
2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment Guide

### Option 1: Netlify (Target)

1. **Push to GitHub**: Make sure your code is in a GitHub repository.
2. **New Site from Git**: In Netlify, choose "Import from Git".
3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
4. **Environment Variables** (Crucial):
   - Go to **Site Settings > Environment Variables**.
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add `NEXT_PUBLIC_SITE_URL` (Set this to your Netlify URL, e.g., `https://lovers-room.netlify.app`)
5. **Deploy**: Click "Deploy Site".

*Note: A `netlify.toml` file is included to ensure Node.js v20 is used.*

### Option 2: Vercel (Recommended)

Vercel is the creators of Next.js and offers the best zero-config experience.

1. **Import Project**: Go to [Vercel](https://vercel.com/new) and import your repo.
2. **Environment Variables**: Add the Supabase keys when prompted.
3. **Deploy**: Click Deploy. Everything else is automatic.
