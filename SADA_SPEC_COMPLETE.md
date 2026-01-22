# صدى (SADA) - Complete Product & Technical Specification
## Live Audio Social Platform for GCC Markets

**Project Name:** صدى (SADA)  
**Document Version:** 2.0 COMPLETE  
**Date:** January 11, 2026  
**Status:** ✅ FINAL SPECIFICATION - READY FOR DEVELOPMENT  
**Timeline:** 6-Week MVP (Weeks 1-6)  
**Target Markets:** Jordan, UAE, Saudi Arabia, Qatar  
**Languages:** Arabic-First (MSA), English Secondary  
**Repository:** `sada-backend` (single repo, under existing org)

---

## EXECUTIVE SUMMARY

**صدى (SADA)** is an **Arab-first, creator-focused live audio social platform** designed for GCC markets. It enables creators to broadcast live audio conversations, monetize through virtual gifts (gems), and build authentic communities in real-time.

### Vision
**Build the leading live audio platform that celebrates Arab creators, amplifies Arab voices, and establishes a thriving creator economy in the Middle East.**

### Core Differentiators
- ✅ **Arabic-First Design** (not translated from English)
- ✅ **Creator Monetization from Day 1** (gems system built-in)
- ✅ **Regional Focus** (by Arab creators, for Arab audiences)
- ✅ **Fast MVP** (6 weeks, not 6+ months)
- ✅ **Self-Hosted Infrastructure** (minimal cloud dependency)
- ✅ **One Managed Service Only** (Cloudflare RealtimeKit for audio)

### Success Metrics (Week 6 Target)
| Metric | Target |
|--------|--------|
| **Registered Users** | 10,000 |
| **Daily Active Users** | 1,500 |
| **Monthly Active Users** | 5,000 |
| **Creator Accounts** | 50-100 |
| **Rooms Per Day** | 50+ |
| **Average Room Size** | 20-50 listeners |
| **Concurrent Users (Peak)** | 100-200 |
| **Average Session Duration** | 30+ minutes |

---

## PART 1: PRODUCT SPECIFICATION

### What is SADA?

A live audio streaming platform where:

1. **Creators host live rooms** on topics they're passionate about
2. **Listeners discover and join rooms** by interest, category, or following
3. **Real-time engagement** through voice conversations and chat
4. **Creators earn gems** from listener gifts (virtual currency)
5. **Community growth** through organic word-of-mouth in Arabic communities

### Core Use Cases

| Use Case | Description | Value Delivered |
|----------|-------------|-----------------|
| **Live Broadcasting** | Creators start audio rooms | Real-time audience connection |
| **Community Building** | Follow creators, join conversations | Authentic Arab networks |
| **Creator Monetization** | Earn gems from listeners | Creator incentive & income |
| **Discovery** | Find trending rooms & creators | User engagement & retention |
| **Events & Announcements** | Scheduled live discussions | Recurring engagement |

---

## FEATURE SET (MVP - WEEKS 1-6)

### Feature 1: User Authentication & Profile

**Requirement:** Apple Sign-In (iOS primary), user profiles with Arabic support

**Flow:**
```
User taps "Sign in with Apple"
  → Request: Full Name, Email
  → Create user account
  → Setup profile (avatar, username, bio)
  → Navigate to home screen
```

**Profile Components:**
- ✅ Profile picture (avatar)
- ✅ Display name (username)
- ✅ Bio (Arabic text support)
- ✅ Follower count
- ✅ Gem balance (for creators)
- ✅ Verification badge (future)
- ✅ Follow/Unfollow button

**Acceptance Criteria:**
- [ ] Apple Sign-In functional on iOS device
- [ ] Profile auto-created post-signup
- [ ] Profile editable from settings
- [ ] Avatar upload works
- [ ] Arabic text renders correctly
- [ ] Data persists across sessions

---

### Feature 2: Discover Rooms (Home Screen)

**Requirement:** Browse and join live audio rooms

**Home Tab Layout:**
```
┌─ Live Indicator (🔴 مباشر الآن)
├─ Trending Rooms Section
│  └─ Horizontal scroll (5-10 visible)
├─ For You Section (recommendations)
├─ Categories
│  ├─ Music (موسيقى)
│  ├─ Comedy (كوميديا)
│  ├─ Talk (نقاش)
│  ├─ Sports (رياضة)
│  └─ Business (أعمال)
└─ Search Bar (بحث)
```

**Room Card Display:**
```
┌──────────────────────────┐
│ [Room Cover Image]       │
│ 🔴 مباشر الآن (Live)    │
│ Room Title               │
│ Host: [Creator Name]     │
│ 👥 [Listener Count]      │
│ [Category Badge]         │
│ [Join Button]            │
└──────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Room list loads on startup
- [ ] Trending rooms update real-time
- [ ] Clicking room joins with audio
- [ ] Room cards display all info
- [ ] Search functionality works
- [ ] Arabic text displays correctly

---

### Feature 3: Live Room Experience

**Requirement:** Join, listen, and interact in live audio rooms

**Room UI Layout:**
```
┌─ Header
│  ├─ Room title
│  ├─ 👥 Listener count
│  └─ 💎 Send gift button
├─ Host Section
│  ├─ Host avatar (large)
│  ├─ Host name + badge
│  └─ Host bio
├─ Active Speakers
│  └─ Speaking indicator animation
├─ Real-time Chat
│  ├─ Message feed
│  └─ Message input
└─ Bottom Controls
   ├─ 👋 Raise hand (request to speak)
   ├─ ❤️ Like room
   ├─ 💬 Chat input
   ├─ 🔊 Volume control
   └─ ✕ Leave room
```

**Voice Listening:**
- ✅ Clear, low-latency audio (<500ms)
- ✅ Volume control (mute/unmute)
- ✅ Background audio (continues when app backgrounded)
- ✅ Notification when host ends room

**Raise Hand (Request to Speak):**
- ✅ Tap button to request speaking
- ✅ Host sees request queue
- ✅ Host accepts/rejects
- ✅ Mic activates when approved
- ✅ User receives notification

**Chat:**
- ✅ Real-time text messages
- ✅ Username display
- ✅ Emoji support (🎤❤️💎)
- ✅ Tap username to view profile
- ✅ Message timestamp

**Send Gifts:**
- ✅ Gift button with gem options (1, 5, 10, 50)
- ✅ Confirmation dialog
- ✅ Animation on send
- ✅ Host notification
- ✅ "Gift sent!" confirmation

**Acceptance Criteria:**
- [ ] Audio streams without lag
- [ ] Chat updates in real-time
- [ ] Raise hand works correctly
- [ ] Gifts trigger animations
- [ ] Background audio functional
- [ ] Arabic chat displays properly
- [ ] Room persists if user returns

---

### Feature 4: Host a Room (Create Room)

**Requirement:** Creators start and manage live rooms

**Create Room Flow:**
```
Plus (+) Button → Room Creation Screen
  ├─ Title Input (Max 100 chars, Arabic)
  ├─ Category Selection
  │  ├─ Music (موسيقى)
  │  ├─ Comedy (كوميديا)
  │  ├─ Talk (نقاش)
  │  ├─ Sports (رياضة)
  │  └─ Business (أعمال)
  ├─ Description (Max 500 chars, optional)
  ├─ Launch Options
  │  ├─ Go Live Now (ابدأ الآن)
  │  └─ Schedule (جدول زمني - Phase 2)
  ├─ Settings
  │  ├─ Allow speakers (السماح للمتحدثين)
  │  └─ Enable chat (تفعيل الدردشة)
  └─ Start Room Button (ابدأ الغرفة)
```

**Host Controls (Inside Room):**
```
Host Dashboard
  ├─ Speaker Queue
  │  ├─ List of raised hands
  │  ├─ Accept/Reject buttons
  │  └─ Mute speaker option
  ├─ Moderation Tools
  │  ├─ Mute individual speakers
  │  ├─ Remove speakers
  │  └─ Block users (Phase 2)
  ├─ Room Settings
  │  ├─ Enable/disable new speakers
  │  ├─ Enable/disable chat
  │  └─ End room button
  └─ Analytics
     └─ Current listener count
```

**Acceptance Criteria:**
- [ ] Room creation form works
- [ ] Room goes live immediately
- [ ] Host can manage speakers
- [ ] Host can mute/remove speakers
- [ ] Arabic category names display
- [ ] Room persists if host reconnects
- [ ] "Room ended" notification sent

---

### Feature 5: Discover & Follow Creators

**Requirement:** Find and follow interesting creators

**Following Tab (متابعتي):**
```
Following List
  ├─ Creator cards (list view)
  ├─ Avatar, name, bio preview
  ├─ Follower count
  ├─ "Unfollow" button
  └─ Online status indicator
```

**Discover Tab (اكتشف):**
```
Discovery Screen
  ├─ Top Creators (المبدعون الأوائل)
  │  └─ Ranked by listener count (top 10)
  ├─ New Creators (مبدعون جدد)
  │  └─ Recently joined (10 most recent)
  ├─ By Category (حسب الفئة)
  │  └─ Filter by category
  └─ Creator Search
     └─ Search by name
```

**Creator Profile Page:**
```
Creator Profile
  ├─ Header
  │  ├─ Large avatar
  │  ├─ Name + verification badge
  │  ├─ Follow/Unfollow button
  │  └─ Bio
  ├─ Stats
  │  ├─ Followers count
  │  ├─ Total listeners
  │  └─ Gems earned (own profile only)
  ├─ Upcoming Rooms (scheduled)
  └─ Recent Rooms (archived - Phase 2)
```

**Acceptance Criteria:**
- [ ] Following list loads correctly
- [ ] Follow/unfollow buttons work
- [ ] Creator profile loads
- [ ] Follower counts accurate
- [ ] Online status displays
- [ ] Search functionality works
- [ ] Arabic text displays in bios

---

### Feature 6: User Profile & Settings

**Requirement:** Manage profile, notifications, language, privacy

**Profile Tab (حسابي):**
```
Profile Screen
  ├─ Personal Info
  │  ├─ Profile picture (edit)
  │  ├─ Display name (edit)
  │  ├─ Bio (edit)
  │  ├─ Username/ID
  │  ├─ Verification status
  │  └─ Member since date
  ├─ Stats
  │  ├─ Total followers
  │  ├─ Total rooms hosted
  │  ├─ Total listener hours
  │  └─ Gems earned
  └─ Settings Section
     ├─ Account Settings
     │  ├─ Email management
     │  └─ Apple ID link
     ├─ Notification Settings
     │  ├─ Push notifications on/off
     │  ├─ Email notifications on/off
     │  └─ Notification preferences
     ├─ Language Settings
     │  ├─ Arabic (عربي) - Default
     │  ├─ English - Fallback
     │  └─ RTL mode
     ├─ Privacy Settings
     │  ├─ Profile visibility
     │  ├─ Block list
     │  └─ Report issues
     ├─ App Settings
     │  ├─ Audio quality preference
     │  ├─ Data usage mode
     │  ├─ Dark mode toggle
     │  └─ Version info
     └─ Sign Out Button (تسجيل الخروج)
```

**Acceptance Criteria:**
- [ ] Profile edits save correctly
- [ ] Settings persist after close
- [ ] Notifications configured properly
- [ ] Language toggle works
- [ ] RTL mode displays correctly
- [ ] Sign out clears user data
- [ ] All text in Arabic

---

### Feature 7: Notifications

**Requirement:** Keep users engaged with timely alerts

**Notification Types:**

1. **Room Notifications (غرفة)**
   - Message: "A creator you follow is going live"
   - Shows: Creator name + room topic
   - Action: Tap to join

2. **Follower Notifications**
   - Message: "[Name] started following you"
   - Action: Tap to view profile

3. **Gift Notifications (for hosts)**
   - Message: "[Name] sent you a 💎 gem!"
   - Shows: Gem count earned
   - Action: Tap to see summary

4. **System Notifications**
   - "You were removed from room"
   - "Room ended"
   - "New feature available"

**Notification Channels:**
- ✅ In-App: Bell icon with badge
- ✅ Push: iOS notification center
- ✅ In-Room: Notifications at bottom
- ✅ Email: Daily digest (optional, Phase 2)

**Acceptance Criteria:**
- [ ] Notifications sent at correct times
- [ ] Push notifications work on iOS
- [ ] Content clear in Arabic
- [ ] Tapping opens correct screen
- [ ] Badge counts update
- [ ] Users can disable notifications

---

### Feature 8: Monetization (Gems System)

**Requirement:** Creators earn from listener engagement

**Gems System Overview:**

```
User Gem Balance
  ├─ Gems owned: [NUMBER] 💎
  ├─ Starting balance: 10 gems (free)
  └─ Send gems to creators

Sending Gems (Listener)
  ├─ Tap "💎 Send Gift" in room
  ├─ Choose amount: 1, 5, 10, or 50
  ├─ Confirmation: "Send [N] gems to [Creator]?"
  ├─ Gems deducted from balance
  ├─ Creator receives gems
  ├─ Animation + celebration in room
  └─ Creator notified

Earning Gems (Creator)
  ├─ Receive gems from listeners
  ├─ 1:1 ratio (1 gem received = 1 gem earned)
  ├─ Visible in: Creator profile + Settings
  ├─ Payout: Phase 2 (in-app purchase for gems)
  └─ Commission: Platform 30%, Creator 70%
```

**Gem Allocation (MVP):**
- ✅ All users get: 10 gems on signup (free)
- ✅ Creators earn: 1:1 ratio from listeners
- ✅ No purchases yet (Phase 2)
- ✅ Display in profile & settings

**Acceptance Criteria:**
- [ ] Gems display correctly
- [ ] Gift sending works without payment
- [ ] Creator receives gems
- [ ] Notifications sent
- [ ] Gem balance updates real-time
- [ ] No duplicate transactions

---

## PART 2: TECHNICAL SPECIFICATION

### Technology Stack

| Layer | Technology | Reasoning |
|-------|-----------|-----------|
| **Frontend** | React Native + Expo | iOS rapid dev, OTA updates, live reload |
| **Backend** | Node.js 18 + Express + TypeScript | Single language, type safety, fast |
| **Database** | PostgreSQL (Local) | ACID, structured, proven at scale |
| **Real-time Chat** | Socket.io + Redis | WebSocket, message delivery, caching |
| **Audio Streaming** | Cloudflare RealtimeKit | Only managed service - multi-user mixing |
| **File Storage** | Local Filesystem (/var/sada/uploads) | Fast, no cloud costs |
| **Web Server** | Nginx | Reverse proxy, SSL/TLS, compression |
| **Process Manager** | PM2 | Auto-restart, clustering, monitoring |
| **Testing** | Jest + React Native Testing Library | Unit & integration tests |
| **CI/CD** | GitHub Actions | Free with GitHub |
| **Push Notifications** | Expo Notifications | Built-in with Expo |

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              SADA Complete System Architecture               │
└─────────────────────────────────────────────────────────────┘

┌─ iOS App (React Native + Expo)
│  ├─ Auth Flow (Apple Sign-In)
│  ├─ Room UI (Discovery, Join, Host)
│  ├─ Chat Component (Real-time messages)
│  ├─ Audio Player (Background audio)
│  └─ Push Notifications (Expo)
│
├─ HTTPS/WebSocket (Encrypted)
│
┌─ Nginx (Reverse Proxy + Load Balancer)
│  ├─ SSL/TLS Certificate (Let's Encrypt)
│  ├─ Rate Limiting & DDoS Protection
│  ├─ Gzip Compression
│  ├─ Static File Serving (/var/sada/uploads)
│  └─ WebSocket Upgrade
│
├─ localhost:3000
│
┌─ Node.js Backend (Express + TypeScript)
│  ├─ Auth Service (Apple Sign-In verification)
│  ├─ Room Service (CRUD operations)
│  ├─ User Service (Profiles, followers)
│  ├─ Chat Service (Socket.io server)
│  ├─ Gems Service (Transactions)
│  ├─ Notification Service (Push & in-app)
│  └─ PM2 (Process management, auto-restart)
│
├─ TCP Connections
│
┌─ PostgreSQL (Local Database)
│  ├─ Users (profiles, auth)
│  ├─ Rooms (metadata, status)
│  ├─ Messages (chat logs)
│  ├─ Followers (relationships)
│  ├─ Gem_transactions (monetization)
│  ├─ Gem_balance (user balances)
│  └─ Automated Daily Backups
│
├─ Redis (Cache + Real-time)
│  ├─ Active rooms cache
│  ├─ User online status
│  └─ Message queue
│
├─ HTTPS (External Only)
│
☁️ Cloudflare RealtimeKit (ONLY Managed Service)
   ├─ Multi-user audio mixing
   ├─ Low-latency streaming (<100ms)
   ├─ Automatic quality adaptation
   └─ Global CDN presence
│
├─ Local File System
│
└─ /var/sada/uploads (Avatar & image storage)
   └─ Served by Nginx (very fast)
```

### Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  apple_id VARCHAR UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR,
  verified BOOLEAN DEFAULT false,
  language VARCHAR(5) DEFAULT 'ar',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  host_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'live',
  listener_count INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  allow_speakers BOOLEAN DEFAULT true,
  chat_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room Participants
CREATE TABLE room_participants (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  role VARCHAR(20) DEFAULT 'listener',
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP
);

-- Messages (Chat)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Followers
CREATE TABLE followers (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES users(id) NOT NULL,
  following_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Gem Transactions
CREATE TABLE gem_transactions (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id) NOT NULL,
  receiver_id UUID REFERENCES users(id) NOT NULL,
  room_id UUID REFERENCES rooms(id) NOT NULL,
  amount INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gem Balance
CREATE TABLE gem_balance (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  total_gems INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_followers_following ON followers(following_id);
```

### Core API Endpoints

```
Authentication:
POST   /api/auth/signin              # Apple Sign-In
GET    /api/auth/user                # Get current user
POST   /api/auth/signout             # Sign out

Rooms:
GET    /api/rooms                    # List live rooms (with filters)
POST   /api/rooms                    # Create room (host only)
GET    /api/rooms/:id                # Get room details
POST   /api/rooms/:id/join           # Join room (listener)
POST   /api/rooms/:id/leave          # Leave room
POST   /api/rooms/:id/end            # End room (host only)
POST   /api/rooms/:id/speakers       # Manage speakers (host only)

Users:
GET    /api/users/:id                # Get user profile
PUT    /api/users/:id                # Update profile
GET    /api/users/:id/rooms          # Get user's rooms
GET    /api/users/:id/followers      # Get follower count
GET    /api/users/:id/following      # Get following list

Followers:
POST   /api/users/:id/follow         # Follow user
DELETE /api/users/:id/follow         # Unfollow user

Gems:
POST   /api/gems/send                # Send gem to creator
GET    /api/users/:id/gems           # Get gem balance
GET    /api/gems/transactions/:id    # Get transaction history

Chat (WebSocket):
WS     /ws/rooms/:id/chat            # Join room chat

Notifications:
GET    /api/notifications            # Get all notifications
POST   /api/notifications/mark-read  # Mark notification as read
```

### Deployment Infrastructure

**Single VPS Setup (Most Cost-Effective):**

```
VPS Specification:
├─ Operating System: Ubuntu 20.04 LTS
├─ CPU: 4 cores (2 minimum, 8+ for growth)
├─ RAM: 8GB (4GB minimum)
├─ Storage: 160GB SSD
├─ Network: 100Mbps+
└─ Providers: DigitalOcean, Linode, Vultr (~$25-30/month)

Installed Services:
├─ Node.js 18 LTS
├─ PostgreSQL 13+ (with daily automated backups)
├─ Nginx (reverse proxy + SSL/TLS)
├─ PM2 (process management)
├─ Redis (caching)
├─ Let's Encrypt (free SSL certificates)
└─ Ubuntu Firewall (UFW)

Monthly Cost:
├─ VPS Server: $25-30
├─ Domain: $1-2 (averaged from annual)
├─ Cloudflare RealtimeKit (audio): $300-600
├─ Backups/Storage: $0 (local)
└─ Total: ~$330-640/month (MVP with 50+ rooms/day)
```

**What's NOT in the Cloud:**
- ✅ Database (PostgreSQL local)
- ✅ API Server (Node.js local)
- ✅ File Storage (local filesystem)
- ✅ Chat (Socket.io local)
- ✅ Notifications (Expo local)

**What IS in the Cloud (Only):**
- ☁️ Cloudflare RealtimeKit (audio mixing - only managed service)

### Deployment Checklist

**Phase 1: Server Setup (2-3 hours)**
- [ ] Provision VPS
- [ ] SSH access configured
- [ ] Ubuntu 20.04 installed
- [ ] Firewall enabled

**Phase 2: Install Core Services (1-2 hours)**
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed (Docker or native)
- [ ] Nginx installed
- [ ] PM2 installed
- [ ] Git configured

**Phase 3: Database Setup (30 min)**
- [ ] PostgreSQL user created
- [ ] Database initialized
- [ ] Schema created (init.sql)
- [ ] Indexes created
- [ ] Backup script scheduled

**Phase 4: Node.js Backend (1-2 hours)**
- [ ] Clone backend repo
- [ ] npm install
- [ ] .env configured
- [ ] npm run build
- [ ] npm test passes

**Phase 5: Nginx Setup (1 hour)**
- [ ] Nginx config created
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Config validated
- [ ] Health check working

**Phase 6: PM2 Deployment (30 min)**
- [ ] ecosystem.config.js created
- [ ] PM2 started
- [ ] Auto-startup configured
- [ ] Health check passing

**Phase 7: Monitoring (30 min)**
- [ ] Log rotation configured
- [ ] Backup script scheduled
- [ ] Monitoring tools installed
- [ ] Alert emails set up

**Total Setup Time: 8-12 hours (first time)**

---

## PART 3: DEVELOPMENT ROADMAP

### Week 1: Foundation & Authentication
**Goal:** Users can sign up and create profiles

- [ ] GitHub repo setup (`sada-backend`)
- [ ] Project structure created
- [ ] Environment files (.env template)
- [ ] Apple Sign-In integration
- [ ] User table created
- [ ] Profile setup screen (Arabic UI)
- [ ] Database migrations
- [ ] Authentication tests

**Deliverable:** Functional signup & profile creation

---

### Week 2: Rooms & Discovery
**Goal:** Users can create and discover rooms

- [ ] Room creation API
- [ ] Home screen UI (discover rooms)
- [ ] Room listing API with filtering
- [ ] Category system implementation
- [ ] Search functionality
- [ ] Real-time room status updates
- [ ] Room detail page
- [ ] Integration tests for rooms

**Deliverable:** Room discovery & creation working end-to-end

---

### Week 3: Real-time Audio Integration
**Goal:** Live audio streaming functional

- [ ] Cloudflare RealtimeKit integration
- [ ] Audio streaming setup
- [ ] Room experience UI (inside room)
- [ ] Raise hand functionality
- [ ] Speaker queue management
- [ ] Audio latency optimization
- [ ] Fallback handling (connection loss)
- [ ] Audio quality tests

**Deliverable:** Live audio with <500ms latency

---

### Week 4: Chat & Following System
**Goal:** Real-time chat and creator discovery

- [ ] Socket.io implementation (WebSocket)
- [ ] Chat UI in rooms
- [ ] Real-time message delivery
- [ ] Follower/following system
- [ ] Creator discovery screens
- [ ] Online status indicators
- [ ] Integration tests for chat
- [ ] Performance optimization

**Deliverable:** Chat and follower system fully functional

---

### Week 5: Monetization & Notifications
**Goal:** Creators can earn, users get engaged

- [ ] Gems system implementation
- [ ] Gift sending feature
- [ ] Gem balance tracking
- [ ] Notification system (in-app + push)
- [ ] Notification UI
- [ ] Notification persistence
- [ ] Analytics tracking
- [ ] Integration tests for gems

**Deliverable:** Complete monetization & notification flow

---

### Week 6: Polish & App Store Submission
**Goal:** Production-ready MVP ready for TestFlight

- [ ] Performance optimization (latency, memory)
- [ ] Bug fixes & testing
- [ ] App icon & splash screen
- [ ] App Store metadata (Arabic + English)
- [ ] Privacy policy & Terms (Arabic + English)
- [ ] TestFlight build creation
- [ ] Beta testing plan
- [ ] Marketing materials prepared

**Deliverable:** App submitted to TestFlight, ready for beta users

---

## PART 4: LAUNCH & SUCCESS CRITERIA

### Functional Requirements ✅

- [ ] Users sign in with Apple ID
- [ ] Arabic profiles with usernames, bios, avatars
- [ ] Creators start live rooms
- [ ] Listeners discover and join rooms
- [ ] Real-time audio works (<500ms latency)
- [ ] Chat messages appear instantly
- [ ] Follow/unfollow creators
- [ ] Send gems to creators
- [ ] Push notifications functional
- [ ] Data persists across sessions
- [ ] Arabic text displays throughout

### Performance Requirements ✅

- [ ] App startup < 3 seconds
- [ ] Room loading < 2 seconds
- [ ] Audio latency < 500ms
- [ ] Chat messages < 200ms
- [ ] Handles 100+ concurrent users
- [ ] Smooth 60 FPS animations
- [ ] No memory leaks

### Quality Requirements ✅

- [ ] 80% code test coverage (Jest)
- [ ] No critical bugs at launch
- [ ] Accessibility (WCAG AA standard)
- [ ] Arabic RTL fully functional
- [ ] iPhone 12+ compatible
- [ ] Battery optimized
- [ ] Network resilient

### User Experience Requirements ✅

- [ ] Intuitive (no tutorial needed)
- [ ] Arabic UI feels native
- [ ] Onboarding < 2 minutes
- [ ] Room join < 5 seconds
- [ ] Clear error messages
- [ ] Graceful offline handling

---

## PART 5: REPOSITORY STRUCTURE

### GitHub Repository Setup

**Repository Name:** `sada-backend`  
**Location:** Under existing org (not new org)  
**Visibility:** Private

**Directory Structure:**
```
sada-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── rooms.controller.ts
│   │   ├── users.controller.ts
│   │   ├── gems.controller.ts
│   │   └── notifications.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── room.service.ts
│   │   ├── user.service.ts
│   │   ├── gems.service.ts
│   │   ├── notification.service.ts
│   │   └── audio.service.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Room.ts
│   │   ├── Message.ts
│   │   ├── Follower.ts
│   │   └── GemTransaction.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   └── validation.middleware.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── rooms.routes.ts
│   │   ├── users.routes.ts
│   │   ├── gems.routes.ts
│   │   └── notifications.routes.ts
│   ├── websocket/
│   │   ├── chat.gateway.ts
│   │   └── events.ts
│   ├── database/
│   │   ├── init.sql (schema)
│   │   ├── seed.sql (test data)
│   │   └── migrations/ (future)
│   └── index.ts (main entry)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/ (Phase 2)
├── nginx/
│   ├── sada.conf (reverse proxy config)
│   └── ssl-config.sh (certificate setup)
├── ecosystem.config.js (PM2 config)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── docker-compose.yml (optional - for local dev)
```

### Git Workflow

**Branches:**
```
main           → Production
  ↑
develop        → Staging/Testing
  ↑
feature/auth   → Feature branches (feature/*)
feature/rooms
bugfix/chat    → Bug fix branches (bugfix/*)
```

**Commit Convention:**
```
feat: Add room creation feature
fix: Fix audio lag in rooms
test: Add tests for gems system
docs: Update API documentation
style: Format code
refactor: Restructure chat service
perf: Optimize database queries
```

---

## PART 6: SECURITY & LOCALIZATION

### Security Checklist ✅

**Network:**
- ✅ All API requests over HTTPS
- ✅ Firewall enabled (UFW)
- ✅ SSH hardened (key-only auth)
- ✅ Rate limiting on APIs
- ✅ CORS properly configured

**Application:**
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input escaping)
- ✅ Secrets in .env (never hardcoded)
- ✅ Apple Sign-In verification

**Database:**
- ✅ Database user minimal privileges
- ✅ Connections encrypted
- ✅ Daily automated backups
- ✅ Backup restoration tested weekly

**SSL/TLS:**
- ✅ Let's Encrypt certificate
- ✅ Auto-renewal configured
- ✅ HSTS header enabled
- ✅ Strong cipher suites

### Arabic Localization ✅

**Language:** Modern Standard Arabic (MSA - الفصحى)

**All Screens in Arabic:**
- ✅ Login/signup
- ✅ Home discovery
- ✅ Room creation
- ✅ Profile management
- ✅ Settings
- ✅ Notifications
- ✅ Error messages

**RTL Support:**
- ✅ Text flows right-to-left
- ✅ Navigation inverted
- ✅ Buttons RTL-positioned
- ✅ Chat RTL-aware
- ✅ Numbers display correctly

**Arabic Fonts:**
- ✅ Cairo or Tajawal (modern, beautiful)
- ✅ Bold for headings
- ✅ Regular for body text
- ✅ OpenType ligatures

---

## PART 7: GO-TO-MARKET STRATEGY

### Launch Timeline

**Week 6 (January 24, 2026):** TestFlight Beta Launch
- 500-1,000 Arabic speakers invited
- Closed beta with feedback collection
- Daily monitoring & bug fixes

**Week 8-10:** Public Launch
- Open beta on App Store
- Creator partnerships established
- Marketing campaign begins

**Week 12+:** Growth Phase
- Scaled user acquisition
- Phase 2 features development
- Monetization (gem purchases)

### User Acquisition (MVP)

**Organic (Week 1-6):**
- Invite creators from TikTok, YouTube (Arabic)
- Influencer seeding (10-20 creators)
- Viral word-of-mouth

**Paid (Week 7+):**
- Twitter/X ads (Arabic markets)
- Instagram ads (Reels)
- TikTok creator partnerships
- Podcast sponsorships

### Positioning

**Brand Message:**
```
"صدى - منصتك العربية الأولى لبث الأصوات"
(SADA - Your first Arab platform for voice broadcasting)

"صداك مهم" - Your voice matters
```

**Hashtags:**
- #صداي (My SADA)
- #صدى_مهم (SADA Matters)
- #صوتي_يهمني (My Voice Matters)
- #مبدعون_عرب (Arab Creators)

---

## PART 8: SUCCESS METRICS & KPIs

### Week 6 Targets (MVP Launch)

**Acquisition:**
| Metric | Target |
|--------|--------|
| Registered Users | 10,000 |
| TestFlight Signups | 500-1,000 |
| Organic Downloads | 80% |
| Creator Accounts | 50-100 |

**Engagement:**
| Metric | Target |
|--------|--------|
| Daily Active Users | 1,500 |
| Monthly Active Users | 5,000 |
| Avg Session Duration | 30+ mins |
| Rooms Per Day | 50+ |
| Avg Room Size | 20-50 listeners |

**Retention:**
| Metric | Target |
|--------|--------|
| Day 1 Retention | 60% |
| Day 7 Retention | 40% |
| Day 30 Retention | 25% |

**Quality:**
| Metric | Target |
|--------|--------|
| Code Coverage | 80%+ |
| Audio Latency | <500ms |
| Critical Bugs at Launch | 0 |
| Crash Rate | <0.1% |

---

## FINAL CHECKLIST BEFORE DEVELOPMENT

- [ ] All team members read this document
- [ ] Repository created (`sada-backend`)
- [ ] Development environment setup
- [ ] VPS provisioned (if self-hosting)
- [ ] Domain registered
- [ ] Apple Developer account ready
- [ ] Cloudflare RealtimeKit account setup
- [ ] First team meeting scheduled
- [ ] Week 1 tasks assigned
- [ ] Development timeline agreed
- [ ] Success metrics understood by all

---

## DOCUMENT CONTROL

**Version:** 2.0 COMPLETE  
**Date:** January 11, 2026  
**Status:** ✅ FINAL - READY FOR DEVELOPMENT  
**Author:** SADA Development Team  
**Next Review:** Week 2 (January 15, 2026)  

**Approval Sign-Off:**

This document has been reviewed and approved. All stakeholders align on product features, technical implementation, timeline, and success criteria.

---

## QUICK REFERENCE LINKS

**Key Docs:**
- Technical Infrastructure: `SADA_INFRASTRUCTURE_FINAL.md`
- Branding Guide: `SADA_BRANDING_ARABIC.md`
- Development Methodology: `Vibe Coding + TDD.md`

**Repositories:**
- Backend: `sada-backend`
- Frontend: `sada-mobile` (separate, uses Expo)

**Deployment:**
- Server: Ubuntu 20.04 LTS VPS (~$25-30/month)
- Database: PostgreSQL (local)
- Audio: Cloudflare RealtimeKit only ($300-600/month)
- Total Cost: ~$330-640/month

**Communication:**
- Team: Daily standups
- Sprint: Weekly reviews
- Stakeholders: Bi-weekly demos

---

## CLOSING STATEMENT

**صدى (SADA)** is positioned to become the **leading Arab-first, creator-focused live audio platform**. With a clear 6-week development timeline, realistic MVP features, and self-hosted infrastructure, we are ready to **launch a production-grade platform** that celebrates Arab creators and establishes a thriving creator economy in the GCC.

**"صداك مهم"** - Your voice matters.

**Let's build something meaningful.** 🚀

---

**END OF SPECIFICATION**
