# تحدي الأبطال — Champions Challenge 🏆

A real-time multiplayer educational board game built as a modern **PWA** with **Vue 3 + TypeScript + Pinia + Tailwind CSS v4 + Vite**.

## Tech Stack
- **Vue 3.5** (`<script setup lang="ts">`)
- **TypeScript 5.8** (strict mode)
- **Pinia 3** (modular stores: `theme`, `workspace`, `game`, `client`)
- **Tailwind CSS v4** (`@tailwindcss/vite` — zero vanilla CSS)
- **Vite 6 + vite-plugin-pwa** (offline-capable PWA with auto-updating Service Worker & smart voice caching)
- **PeerJS** (WebRTC host-to-player real-time sync) & **QRCode** (instant mobile joining)

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

## Deploying to Coolify
This repository includes a production-ready multi-stage [Dockerfile](Dockerfile) and [nginx.conf](nginx.conf) with:
- Node 22 build stage + lightweight Nginx 1.27 Alpine runner
- SPA fallback (`try_files $uri $uri/ /index.html`)
- Gzip compression & `/health` endpoint for Coolify health checks
- Smart cache headers (`no-cache` for `index.html`, `sw.js`, `manifest.webmanifest`, `voices/manifest.json`; long-term caching for hashed `/assets/` and `/voices/`)

**In Coolify:**
1. Create a new **Application** linked to your Git repository.
2. Set **Build Pack** to **Dockerfile**.
3. Set **Port** to `80` (and Healthcheck Path to `/health` if desired).
4. Deploy!

## Adding New Name Voices
You do **not** need to regenerate existing voices. Add new names to `voice-kit/names.csv` and run:
```bash
cd voice-kit
python generate_voices.py --voice Fenrir
```
Or via Google AI Studio Web:
```bash
cd voice-kit
python generate_voices.py --export-studio
# Save generated batch_1.wav into voice-kit/batches/
python generate_voices.py --split-studio
```
Generated MP3s and `manifest.json` are automatically written to `public/voices/`.
