# ◈ LiveStudio — Self-Hosted Live Streaming Studio

> **A complete, enterprise-grade, browser-based live streaming, recording, webinar, and multistreaming production platform.**  
> Functionally inspired by StreamYard, built from the ground up with 100% original code, architecture, and UI design.

---

## 🌟 Key Features

### 1. Browser-Based Studio Production
- **Real-Time WebRTC Video SFU**: Sub-second latency (<200ms) powered by **LiveKit SFU**.
- **16+ Dynamic Stage Layouts**: Solo, Side-by-side 50/50, Speaker Hero + Grid, 2x2 Quad Grid, 3x3, PiP, Podcast, Presentation, and Custom arrangements.
- **Stage Management**: Instant promotion between **Green Room (device test)**, **Backstage**, and **Live Stage**.
- **Hardware Controls**: In-browser camera/microphone/speaker switching with real-time audio VU volume meters, echo cancellation, and noise suppression.
- **Screen & Slide Sharing**: Window, full display, and browser tab sharing with audio passthrough.

### 2. Live Multistreaming
- **Simultaneous Multi-Destination Broadcast**: Push a single high-definition program feed to **YouTube**, **Twitch**, **Facebook Live**, **LinkedIn**, and **Custom RTMP/RTMPS** endpoints.
- **AES-256-GCM Encrypted Credentials**: Stream keys are encrypted at rest and never exposed to the frontend browser.
- **Per-Destination Health Monitoring**: Real-time bitrate, framerate, packet loss, and automatic reconnection backoff.

### 3. Brand Kit & Overlays
- **Watermark Logos**: Configurable position (top-left, top-right, bottom), opacity, and size.
- **Dynamic Lower-Third Banners**: Pre-formatted title and subtitle lower-thirds with customizable brand accent colors.
- **Animated News Tickers**: Real-time breaking news crawl text at the bottom of the broadcast.
- **Show Chat on Screen**: Single-click display of live comments from YouTube, Twitch, or Webinars onto the broadcast stage.

### 4. Cloud & Local Recording
- **Composited Cloud Recording**: 1080p program feed recording with all logos, overlays, and participant feeds mixed.
- **Isolated Local ISO Tracks**: Clean participant recordings stored in chunks for video editors.
- **Automatic Storage Management**: Direct streaming to MinIO (S3-compatible) with configurable retention policies.

### 5. Interactive Webinars
- **Custom Registration**: Form builder with custom fields and CSV export.
- **Responsive Watch Pages**: Public embeddable viewer page with live video, emoji reactions, and live chat.

### 6. AI Clips & Transcripts (Phase 3 Ready)
- **Automated Transcripts**: Speech-to-text with speaker diarization and SRT/VTT export.
- **AI Shorts & Reels**: Vertical 9:16 re-framing with viral score detection.

---

## 🏗 System Architecture

```
[ Browser Clients ] ──WebRTC──▶ [ LiveKit SFU (7880/7882) ] ──▶ [ Egress / Compositor ]
       │                                                                   │
       ├─── WebSocket (Socket.IO: 4001) ───────┐                           │
       ├─── REST API (Express: 4000) ──────────┼───▶ [ Redis (BullMQ) ]   │
       └─── Web UI (Next.js 14: 3000) ─────────┤         │                 │
                                               ▼         ▼                 ▼
[ Nginx Reverse Proxy (80/443) ] ────▶ [ PostgreSQL ] [ MinIO S3 ] ──▶ [ RTMP Streams ]
                                                                       (YouTube / Twitch)
```

---

## 🚀 Quick Start with Docker & Portainer

### 1. Prerequisites
- Docker Engine 24+ & Docker Compose v2
- Ubuntu 22.04 LTS / 24.04 LTS (recommended) or macOS/Windows with Docker Desktop
- At least 4 CPU Cores and 8 GB RAM for multi-participant 1080p production

### 2. Environment Configuration
Clone the repository and copy the environment template:
```bash
git clone https://github.com/your-org/streaming_studio.git
cd streaming_studio
cp .env.example .env
```
Edit `.env` and fill in secure passwords:
```bash
nano .env
```
Key variables to update:
- `POSTGRES_PASSWORD`: Strong database password
- `MINIO_ROOT_PASSWORD`: Object storage password
- `LIVEKIT_API_SECRET`: WebRTC secret key
- `JWT_SECRET`: 32+ character authentication secret
- `ENCRYPTION_KEY`: 32-byte hex key for stream key encryption

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Deploy via Portainer
1. Log into your **Portainer Web UI**.
2. Navigate to **Stacks** ➔ **Add stack**.
3. Name your stack: `livestudio`.
4. Select **Web editor** and paste the contents of `docker-compose.yml`.
5. Under **Environment variables**, paste your configured `.env` values.
6. Click **Deploy the stack**.

Persistent volumes are automatically preserved across stack updates:
- `livestudio_postgres_data`
- `livestudio_redis_data`
- `livestudio_minio_data`

---

## 💻 Local Development Setup

### 1. Backend Service
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
Backend API will be running on `http://localhost:4000` with WebSocket server on port `4001`.

### 2. Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📁 Repository Structure

```
streaming_studio/
├── docker-compose.yml          # Complete 10-service Docker stack
├── .env.example                # Documented configuration template
├── README.md                   # Complete architectural and deployment manual
├── backend/                    # Express + TypeScript + Prisma ORM
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # 21 PostgreSQL relational models
│   │   └── seed.ts             # Default super-admin & workspace seed
│   └── src/
│       ├── config/             # Typed environment configs
│       ├── middleware/         # Auth, RBAC, Zod validation, Error handler
│       ├── routes/             # Studios, Broadcasts, Destinations, Media, etc.
│       ├── services/           # LiveKit, MinIO S3, AES-256 encryption, WebSocket
│       ├── workers/            # BullMQ background job queues
│       ├── server.ts           # Main REST API entry point
│       ├── ws-server.ts        # Standalone WebSocket cluster
│       └── worker-server.ts    # Transcoding & queue processor
├── frontend/                   # Next.js 14 (App Router) + Tailwind CSS
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Register, Forgot Password
│   │   │   ├── (dashboard)/    # Studios, Broadcasts, Recordings, Destinations, etc.
│   │   │   ├── studio/[id]/    # Flagship Fullscreen Live Studio
│   │   │   ├── join/[token]/   # Guest Check-In & Green Room
│   │   │   └── watch/[id]/     # Public Webinar Watch & Live Chat
│   │   ├── components/
│   │   │   ├── studio/         # StagePreview, LayoutSelector, ChatPanel, BrandPanel
│   │   │   └── ui/             # Glassmorphism design system components
│   │   └── stores/             # Central Zustand real-time stores
├── livekit/                    # LiveKit WebRTC SFU configuration
├── coturn/                     # TURN NAT-traversal server config
└── nginx/                      # Nginx reverse proxy configuration
```

---

## 🔒 Security & Backup Policy

- **Stream Key Protection**: Stream keys are encrypted with AES-256-GCM before writing to PostgreSQL. Raw keys are only decrypted in-memory right when the RTMP pipeline starts.
- **Database Backup**:
  ```bash
  docker exec -t livestudio-postgres pg_dump -U livestudio livestudio > backup_$(date +%Y%m%d).sql
  ```
- **Restore Database**:
  ```bash
  cat backup_20260910.sql | docker exec -i livestudio-postgres psql -U livestudio -d livestudio
  ```

---

## 📄 License
Proprietary / Self-Hosted Commercial License. All rights reserved.
