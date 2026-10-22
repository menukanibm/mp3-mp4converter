# StreamGrab - Video & MP3 Downloader Web Application

A modern, production-grade Next.js (App Router) web application allowing users to fetch and download high-definition videos (1080p, 720p, 480p) and MP3 audio from **YouTube**, **TikTok**, and **Facebook**.

---

## ⚡ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router, TypeScript, Server Components & Dynamic API Routes)
- **Styling**: Tailwind CSS & Lucide React
- **Authentication**: Firebase Authentication (Client SDK + Firebase Admin SDK token verification)
- **Downloader Engine**: `yt-dlp` CLI binary / stream extractor
- **Hosting & Deployment**: Vercel & GitHub ready

---

## 🔒 Strict Authentication Guard

1. **Client-Side Guard**: Unauthenticated users cannot trigger downloads. Clicking "Download" triggers an interactive `AuthModal` prompting login via:
   - **Google Sign-In** (`GoogleAuthProvider`)
   - **Email & Password** (Sign-in or Sign-up tabs)
2. **Server-Side API Route Guard**: `/api/download` strictly inspects `Authorization: Bearer <idToken>` and verifies it using `firebase-admin` (`verifyIdToken`). Requests without valid tokens immediately receive `401 Unauthorized`.

---

## 🚀 Quick Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Firebase credentials:
- `NEXT_PUBLIC_FIREBASE_*` (from Firebase Console > Project Settings > General > Your Apps)
- `FIREBASE_*` (from Firebase Console > Project Settings > Service Accounts > Generate new private key)

### 3. Install `yt-dlp` (For local media stream extraction)
- **Windows**: `winget install yt-dlp` or download `yt-dlp.exe` to `./bin/yt-dlp.exe`.
- **macOS**: `brew install yt-dlp`
- **Linux**: `sudo apt install yt-dlp` or `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to GitHub & Vercel

### Step 1: Initialize Git and Push to GitHub
```bash
git init
git add .
git commit -m "feat: complete production-ready video downloader with Firebase auth"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New"** > **"Project"**.
2. Import your GitHub repository.
3. In **Environment Variables**, paste all keys from your `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (formatted with `\n` preserved)
4. Click **Deploy**. Vercel will automatically build and publish your app!
