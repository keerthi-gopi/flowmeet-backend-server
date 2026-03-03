# 📹 Zoom Clone — MVP Product Requirements Document

> **Build a Real-Time Video Conferencing App — 100% Free Stack**
> Version 1.0 | 2025

| ⏱ Build Time | 💰 Monthly Cost | 🛠 AI Tools | 🚀 Goal |
|---|---|---|---|
| 4–6 Weeks | $0/month | Claude / Cursor / ChatGPT | MVP Ready |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Free Tech Stack](#2-free-tech-stack-zero-cost)
3. [MVP Feature Specification](#3-mvp-feature-specification)
4. [Database Schema](#4-database-schema-supabase)
5. [Folder Structure](#5-project-folder-structure)
6. [Socket.IO Event Reference](#6-socketio-event-reference)
7. [Sequential Build Phases](#7-sequential-build-phases)
8. [AI Build Prompts](#8-ai-build-prompts-copy-paste-ready)
9. [Cost Breakdown](#9-cost-breakdown)
10. [Timeline](#10-estimated-timeline)
11. [Success Criteria](#11-mvp-success-criteria)
12. [Quick Start Commands](#12-quick-start-commands)

---

## 1. Product Overview

A lightweight, browser-based video conferencing MVP built entirely with free and open-source technologies. No credit card, no paid APIs — just real-time video, audio, and chat for up to 10 concurrent users per room.

### 1.1 Goal & Vision

- Allow users to create or join video meeting rooms instantly with a shareable link
- Support real-time audio/video communication using WebRTC peer-to-peer technology
- Include live text chat within the meeting
- Support mute/unmute audio and enable/disable camera
- Screen sharing support (desktop and application window)
- No user registration required for joining — just a room link

### 1.2 Target Users

- Small teams (2–10 members) needing free, simple video calls
- Students, educators, and remote workers
- Developers learning WebRTC and real-time communication

### 1.3 Non-Goals for MVP

- ❌ Recording functionality — post-MVP
- ❌ Breakout rooms — post-MVP
- ❌ More than 10 simultaneous users — needs SFU for scale
- ❌ Mobile native apps — web responsive only
- ❌ Paid features or monetization — out of scope

---

## 2. Free Tech Stack (Zero Cost)

> Every technology listed below is free-tier or open-source. No paid APIs required.

### 2.1 Core Technologies

| Layer | Technology | Why Free | Free Tier Limit |
|---|---|---|---|
| Frontend | Next.js 14 (React) | Open source | Unlimited |
| Styling | Tailwind CSS | Open source | Unlimited |
| Backend | Node.js + Express | Open source | Unlimited |
| Real-time | Socket.IO | Open source, self-hosted | Unlimited |
| Video/Audio | WebRTC (native browser API) | Built into every browser | Unlimited |
| STUN Server | Google STUN (`stun.l.google.com`) | Free public server | Unlimited |
| Database | Supabase (PostgreSQL) | Free tier forever | 500MB / 50K rows |
| Auth | Supabase Auth | Free tier forever | 50,000 MAU |
| Hosting (FE) | Vercel Hobby Plan | Free for personal projects | 100GB bandwidth/mo |
| Hosting (BE) | Render.com Free Tier | Free web service | 750 hrs/month |
| Domain | Vercel subdomain | Free `.vercel.app` domain | Unlimited |

### 2.2 Architecture Overview

```
Browser A (User 1)                    Browser B (User 2)
     |                                       |
     |  WebRTC Offer/Answer (via Socket.IO)  |
     |<------------------------------------->|
     |                                       |
     |        Peer-to-Peer Video/Audio       |
     |<=====================================>|
     |                                       |
     +-----------> Socket.IO Server <--------+
                   (Node.js on Render)
                          |
                    Supabase DB
                  (Room metadata,
                   Chat history)
```

### 2.3 WebRTC Signaling Flow

1. User A opens room → Socket.IO emits `join-room`
2. User B joins → Socket.IO notifies User A with `user-joined`
3. User A creates `RTCPeerConnection` + Offer → sends to B via Socket
4. User B creates Answer → sends back to A via Socket
5. ICE candidates exchanged via Socket.IO relay
6. Direct peer-to-peer video/audio stream established ✅
7. STUN server (Google free) handles NAT traversal

---

## 3. MVP Feature Specification

### 3.1 Feature Priority Matrix

| Feature | Priority | Phase | Effort |
|---|---|---|---|
| Create meeting room + shareable link | **P0 Must** | Phase 1 | Low |
| Join room via link (no auth needed) | **P0 Must** | Phase 1 | Low |
| Real-time video & audio (WebRTC) | **P0 Must** | Phase 2 | High |
| Mute / unmute microphone | **P0 Must** | Phase 2 | Low |
| Enable / disable camera | **P0 Must** | Phase 2 | Low |
| Leave / end meeting | **P0 Must** | Phase 2 | Low |
| In-meeting text chat | **P1 Should** | Phase 3 | Medium |
| Screen sharing | **P1 Should** | Phase 3 | Medium |
| Participant list panel | **P1 Should** | Phase 3 | Low |
| Responsive UI (mobile-friendly) | **P1 Should** | Phase 4 | Medium |
| User auth + room history | **P2 Nice** | Phase 4 | Medium |
| Recording | **P3 Post-MVP** | Phase 5+ | High |

### 3.2 Feature Details

#### F1: Room Creation & Joining
- Landing page with "New Meeting" button
- Generates UUID-based room ID (e.g., `/room/abc123-xyz`)
- One-click copy shareable link to clipboard
- Join page: enter room URL → optionally enter display name
- **No account required** to join a room

#### F2: Video & Audio (WebRTC)
- `getUserMedia()` for camera + microphone access
- `RTCPeerConnection` for peer-to-peer streaming
- Display up to 10 video tiles in a responsive CSS grid
- Mute toggle — visual mute icon shown on tile
- Camera off toggle — shows avatar/initials when camera is disabled
- Audio level indicator per participant

#### F3: Text Chat
- Sidebar panel toggled from the toolbar
- Socket.IO broadcasts messages to all room participants
- Shows sender name + timestamp
- Chat history cleared when meeting ends (optional: persist to Supabase)

#### F4: Screen Sharing
- `getDisplayMedia()` API — browser native, completely free
- Replaces camera track with screen track in all peer connections
- Screen share icon highlighted when active
- Only one participant shares at a time (MVP limit)
- Auto-stops when user clicks browser's native "Stop sharing"

---

## 4. Database Schema (Supabase)

```sql
-- Rooms Table
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code   TEXT UNIQUE NOT NULL,
  host_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE
);

-- Messages Table (chat history per room)
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Participants Table (for analytics)
CREATE TABLE participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  left_at      TIMESTAMPTZ
);
```

---

## 5. Project Folder Structure

```
zoom-clone/
├── frontend/                     # Next.js 14 App
│   ├── app/
│   │   ├── page.tsx              # Landing page (Create / Join meeting)
│   │   ├── room/
│   │   │   └── [roomId]/
│   │   │       └── page.tsx      # Meeting room page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── VideoGrid.tsx         # Responsive video tile grid
│   │   ├── VideoTile.tsx         # Single participant video tile
│   │   ├── MeetingToolbar.tsx    # Mute, cam, share, end controls
│   │   ├── ChatPanel.tsx         # Sidebar text chat
│   │   └── ParticipantList.tsx   # List of connected participants
│   ├── hooks/
│   │   ├── useWebRTC.ts          # Core WebRTC logic hook
│   │   ├── useSocket.ts          # Socket.IO connection hook
│   │   └── useMediaStream.ts     # Camera/mic stream hook
│   └── lib/
│       └── supabase.ts           # Supabase client
│
├── backend/                      # Node.js + Socket.IO server
│   ├── src/
│   │   ├── index.ts              # Express + Socket.IO setup
│   │   ├── rooms.ts              # Room management logic
│   │   └── signaling.ts          # WebRTC signaling events
│   └── package.json
│
└── README.md
```

---

## 6. Socket.IO Event Reference

| Event Name | Direction | Payload | Purpose |
|---|---|---|---|
| `join-room` | Client → Server | `{ roomId, userId, name }` | User joins a room |
| `user-joined` | Server → Client | `{ userId, name }` | Notify others of new user |
| `user-left` | Server → Client | `{ userId }` | Notify when user disconnects |
| `webrtc-offer` | Client → Server → Client | `{ offer, toUserId }` | SDP offer for WebRTC |
| `webrtc-answer` | Client → Server → Client | `{ answer, toUserId }` | SDP answer for WebRTC |
| `ice-candidate` | Client → Server → Client | `{ candidate, toUserId }` | ICE candidate exchange |
| `chat-message` | Client → Server → All | `{ text, sender, time }` | Broadcast chat message |
| `mute-update` | Client → Server → All | `{ userId, isMuted }` | Update mute state for all |
| `camera-update` | Client → Server → All | `{ userId, isOff }` | Update camera state for all |
| `screen-share-start` | Client → Server → All | `{ userId }` | Signal screen share begin |
| `screen-share-stop` | Client → Server → All | `{ userId }` | Signal screen share end |

---

## 7. Sequential Build Phases

### ▶ Phase 1 — Project Setup & Landing Page
**Duration: 3–4 days**

- [ ] Initialize Next.js 14 frontend with TypeScript + Tailwind CSS
- [ ] Set up Node.js backend with Express + Socket.IO
- [ ] Create Supabase project and run database migrations
- [ ] Build landing page: "Create Meeting" button + "Join Meeting" input
- [ ] Room ID generation (UUID) + shareable link copy feature
- [ ] Deploy backend to Render.com (free tier)
- [ ] Deploy frontend to Vercel (hobby plan — free)
- [ ] Configure CORS between frontend and backend

---

### ▶ Phase 2 — WebRTC Core (Video & Audio)
**Duration: 7–10 days**

- [ ] Implement `useMediaStream` hook: `getUserMedia()` for camera + mic
- [ ] Build `useSocket` hook: Socket.IO connection + room events
- [ ] Implement `useWebRTC` hook: `RTCPeerConnection`, offer/answer flow
- [ ] ICE candidate handling via Socket.IO relay
- [ ] Configure Google STUN server: `stun:stun.l.google.com:19302`
- [ ] Build `VideoGrid` component: CSS grid layout for multiple tiles
- [ ] Build `VideoTile` component: render stream in `<video>` element
- [ ] Mute toggle: `replaceTrack()` / `track.enabled = false`
- [ ] Camera toggle: `track.enabled = false/true`
- [ ] ✅ Test 2-person call end-to-end on deployed URLs

---

### ▶ Phase 3 — Chat, Screen Share & Participants
**Duration: 4–5 days**

- [ ] Build `ChatPanel` component with Socket.IO broadcast
- [ ] Optionally store chat messages in Supabase `messages` table
- [ ] Implement screen sharing: `getDisplayMedia()` replaces video track
- [ ] Handle screen share auto-stop (`track.onended` event)
- [ ] Build `ParticipantList` panel showing all connected users
- [ ] Add mute/camera status indicators on video tiles
- [ ] Leave meeting button + cleanup (tracks, connections, socket)
- [ ] Host "End for all" button — emits `end-room` Socket event

---

### ▶ Phase 4 — Polish, Auth & Testing
**Duration: 4–5 days**

- [ ] Responsive layout: video grid adapts for 1–10 participants
- [ ] Mobile-friendly toolbar (bottom bar on small screens)
- [ ] Optional: Supabase Auth for room host login
- [ ] Error states: camera/mic permission denied UI
- [ ] Loading states: "connecting…", "waiting for others to join"
- [ ] Connection quality indicator (via `RTCPeerConnection` stats API)
- [ ] Cross-browser testing: Chrome, Firefox, Safari, Edge
- [ ] Load test: simulate 5–8 concurrent users in one room

---

### ▶ Phase 5 — Post-MVP / Scale
**Duration: Ongoing**

- [ ] Integrate **mediasoup** or **LiveKit** SFU for 10+ users
- [ ] Recording via `MediaRecorder` API + Cloudflare R2 (free tier)
- [ ] Virtual backgrounds using TensorFlow.js BodyPix
- [ ] Waiting room / lobby before host starts the meeting
- [ ] Meeting scheduling + calendar invite links
- [ ] Emoji reactions during calls

---

## 8. AI Build Prompts (Copy-Paste Ready)

> Use these prompts **sequentially** with Claude, Cursor, or ChatGPT. Each prompt is self-contained.

---

### 🤖 Prompt 1 — Project Initialization

```
Create a full-stack Zoom clone project with this structure:
- Frontend: Next.js 14 with TypeScript, Tailwind CSS, App Router
- Backend: Node.js with Express and Socket.IO
- Database: Supabase (PostgreSQL)

Set up:
1. Next.js frontend with Tailwind CSS
2. Express backend with socket.io, cors
3. Supabase client with env variables
4. Folder structure:
   frontend/app, frontend/components, frontend/hooks, frontend/lib
   backend/src with index.ts, rooms.ts, signaling.ts

Include package.json files for both. Provide full runnable code for each file.
```

---

### 🤖 Prompt 2 — Landing Page UI

```
Build the landing page for a Zoom clone using Next.js 14 and Tailwind CSS.

Requirements:
- Hero section with app name and tagline
- "New Meeting" button that generates a UUID room ID and redirects to /room/[roomId]
- "Join Meeting" input + button where user pastes a room link
- Display name input (stored in sessionStorage)
- Copy room link to clipboard functionality
- Clean, modern UI inspired by Google Meet (dark + white theme)
- Fully responsive for mobile

Use Next.js App Router (not pages router). Include all imports.
Generate UUID using the 'uuid' npm package.
```

---

### 🤖 Prompt 3 — Socket.IO Signaling Server

```
Build a Node.js Socket.IO signaling server for WebRTC with Express.

Handle these socket events:
- join-room: { roomId, userId, name } → add to room, emit user-joined to others
- leave-room: → emit user-left, clean up room if empty
- webrtc-offer: { offer, toUserId } → relay to target user
- webrtc-answer: { answer, toUserId } → relay to target user
- ice-candidate: { candidate, toUserId } → relay to target user
- chat-message: { text, sender, time } → broadcast to entire room
- mute-update: { isMuted } → broadcast to room
- camera-update: { isOff } → broadcast to room
- screen-share-start / screen-share-stop → broadcast to room

Use a rooms Map<roomId, Map<userId, {name, socketId}>>.
Configure CORS for http://localhost:3000 and production Vercel URL.
Include TypeScript types for all payloads.
```

---

### 🤖 Prompt 4 — useWebRTC Custom Hook

```
Create a useWebRTC.ts React hook for a Next.js Zoom clone.

The hook should:
1. Accept: localStream (MediaStream), socket (Socket), roomId, userId
2. Manage: Map of RTCPeerConnections keyed by peerId
3. On 'user-joined': create offer and send via socket
4. On 'webrtc-offer': create peer, set remote description, send answer
5. On 'webrtc-answer': set remote description on existing peer
6. On 'ice-candidate': add to the correct RTCPeerConnection
7. On 'user-left': close and remove that peer connection
8. Return: { remoteStreams: Map<userId, MediaStream> }

STUN config:
{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

Use TypeScript. Handle cleanup on unmount. Works with Socket.IO v4.
```

---

### 🤖 Prompt 5 — Video Grid & Tile Components

```
Build VideoGrid.tsx and VideoTile.tsx for a Zoom clone.

VideoGrid:
- Props: localStream, remoteStreams (Map<userId, MediaStream>), participants
- CSS grid that adapts: 1 user = full screen, 2 = side by side, 3–4 = 2×2, 5–9 = 3×3
- Local video pinned bottom-right (picture-in-picture) when 3+ users

VideoTile:
- Props: stream, participantName, isMuted, isCameraOff, isLocal
- Renders <video> with autoPlay, playsInline, muted (for local)
- Shows user initials avatar when camera is off
- Mute badge overlay when muted
- "You" label for local tile, participant name on hover

Tailwind CSS only. Responsive for mobile. Full TypeScript.
```

---

### 🤖 Prompt 6 — Meeting Toolbar

```
Build a MeetingToolbar.tsx component for a Zoom clone.

Controls (use lucide-react icons):
- Mic toggle (Mic / MicOff) — red background when muted
- Camera toggle (Video / VideoOff) — red background when off
- Screen share toggle (Monitor / MonitorOff) — active state highlighted
- Chat toggle (MessageSquare) — unread count badge
- Participants toggle (Users) — shows count
- Leave meeting button (PhoneOff) — red, right-aligned
- End for all button — only visible to host, destructive red

Props:
  isMuted, isVideoOff, isSharing, isChatOpen, isParticipantsOpen,
  onToggleMic, onToggleVideo, onToggleShare, onToggleChat, onLeave, onEnd,
  unreadCount: number, participantCount: number, isHost: boolean

Style: dark bottom bar, rounded buttons, tooltips on hover. Mobile responsive.
```

---

### 🤖 Prompt 7 — Chat Panel

```
Build a ChatPanel.tsx for a Zoom clone with Socket.IO chat.

Features:
- Slide-in panel from right side with CSS transition
- Message list: sender name, message text, timestamp
- Auto-scroll to latest message
- Input field + Send button at bottom
- Empty state: "No messages yet. Say hello! 👋"
- Unread badge count when panel is closed

Socket.IO:
- Send: emit 'chat-message' { text, sender, time: Date.now() }
- Receive: listen to 'chat-message' and append to messages state

Optionally persist to Supabase:
  INSERT INTO messages (room_id, sender_name, content) VALUES (...)

React hooks only (useState, useEffect). Tailwind CSS. Full TypeScript.
```

---

### 🤖 Prompt 8 — Screen Sharing

```
Add screen sharing to the useWebRTC hook and toolbar.

On share start:
- Call navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
- Replace video track in all peer connections with sender.replaceTrack()
- Emit 'screen-share-start' via socket
- Update local video preview to show the screen

On share stop (track.onended OR user clicks stop):
- Get original camera stream back via getUserMedia
- Replace screen track with camera track in all RTCPeerConnections
- Emit 'screen-share-stop' via socket
- Restore local preview to camera

Remote side: listen to screen-share-start/stop and show UI indicator.
On permission denied: show a toast error notification.
Full TypeScript. Handle cleanup properly.
```

---

### 🤖 Prompt 9 — Deployment Configuration

```
Generate all deployment config files for a Zoom clone:

1. vercel.json — Next.js frontend on Vercel
2. render.yaml — Node.js backend on Render.com (free tier)
3. frontend/.env.example:
   NEXT_PUBLIC_SOCKET_URL=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

4. backend/.env.example:
   PORT=
   CLIENT_URL=
   SUPABASE_URL=
   SUPABASE_SERVICE_KEY=

5. README.md with:
   - Local development setup steps
   - Deploy to Vercel + Render (free tier) guide
   - Supabase free tier setup guide
   - Architecture overview

Make everything production-ready for a free-tier deployment.
```

---

## 9. Cost Breakdown

| Service | What It Covers | Free Limit | If Exceeded |
|---|---|---|---|
| Vercel Hobby | Frontend hosting + CDN | 100 GB bandwidth/mo | $20/mo Pro |
| Render.com | Backend Node.js server | 750 hrs/month | $7/mo Starter |
| Supabase Free | PostgreSQL + Auth | 500MB DB, 50K users | $25/mo Pro |
| Google STUN | WebRTC NAT traversal | Unlimited (public API) | Always free |
| Socket.IO | Signaling (self-hosted) | Unlimited on Render | Always free |
| Vercel Domain | `.vercel.app` subdomain | Free forever | Custom domain ~$10/yr |

> ✅ **TOTAL MVP COST: $0/month**
> All services have free tiers sufficient for an MVP with up to ~100 daily active users.

---

## 10. Estimated Timeline

| Week | Phase | Deliverable |
|---|---|---|
| Week 1 | Phase 1 | Project setup, landing page, Supabase + Vercel + Render deploy |
| Week 2 | Phase 2 Part 1 | WebRTC hooks, Socket.IO signaling, working 2-person video call |
| Week 3 | Phase 2 Part 2 | Multi-user grid, mute/camera toggles, ICE handling |
| Week 4 | Phase 3 | Chat panel, screen sharing, participant list |
| Week 5 | Phase 4 | Polish, responsive UI, error handling, cross-browser tests |
| Week 6 | Phase 4 | Load testing, bug fixes, optional auth, public launch 🚀 |

---

## 11. MVP Success Criteria

| Metric | Target | How to Measure |
|---|---|---|
| 2-person video call | 100% success rate | Manual QA on 3+ browsers |
| Room join time | < 3 seconds | Time from URL open to video visible |
| Audio/video quality | No lag at 720p | Manual test + WebRTC stats API |
| Screen sharing | Works on Chrome + Firefox | Manual QA |
| Chat latency | < 500ms | Socket.IO event timing |
| 5-person call | All streams visible | Manual test with 5 devices |
| Mobile responsive | Usable on iOS + Android | Chrome DevTools + real device |
| Monthly cost | $0 | Review Vercel + Render dashboards |

---

## 12. Quick Start Commands

```bash
# 1. Clone the repo
git clone https://github.com/your-username/zoom-clone.git
cd zoom-clone

# 2. Install frontend dependencies
cd frontend && npm install

# 3. Install backend dependencies
cd ../backend && npm install

# 4. Set up environment variables
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
# → Fill in your Supabase URL, keys, and socket URL

# 5. Start development servers

# Terminal 1 — Backend
cd backend && npm run dev      # Runs on http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev     # Runs on http://localhost:3000

# 6. Open your browser
open http://localhost:3000
```

---

> **Built with:** Next.js · Node.js · WebRTC · Socket.IO · Supabase · Vercel · Render
>
> **Total Cost:** $0/month · **Build Time:** 4–6 Weeks · **Version:** 1.0
