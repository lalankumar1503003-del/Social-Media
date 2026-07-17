# Implementation Plan - Lalan Connect: A Real-Time Social Hub

Lalan Connect is a full-featured real-time social media platform built using the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. It supports normal user operations (posting, commenting, liking, following, messaging, group chats, live notifications) and features a comprehensive Admin Dashboard (user management, content moderation, system setting controls, live analytics monitoring, and security audit logging).

Founder: Mr. Lalan Kumar.

---

## User Review Required

> [!IMPORTANT]
> **MongoDB Database Execution**
> To make the app run instantly out-of-the-box without requiring a pre-installed MongoDB instance on the host machine, we will configure the backend to automatically spin up a **MongoDB Memory Server** (`mongodb-memory-server`) as a fallback if no `MONGODB_URI` environment variable is defined. This allows direct, zero-config startup (`npm run dev`) for evaluation.

> [!NOTE]
> **UI Styling & Aesthetics**
> We will design the frontend using **Vanilla CSS with a rich CSS Variable-based theme**. It will feature a premium glassmorphic dark theme (deep indigo, glowing cyan, and slate colors) with smooth micro-animations, satisfying the web application guidelines for visual excellence.

---

## Open Questions

None at the moment. If you have any modifications or feature requests, please provide feedback when approving the plan.

---

## Proposed Changes

### Monorepo Structure

We will structure the project with a root directory that orchestrates both client and server development simultaneously.

```
/ (Workspace Root: Scoal Media)
├── package.json               # Root scripts to run backend & frontend concurrently
├── server/                    # Node + Express + Socket.io backend
│   ├── package.json
│   ├── server.js              # Server entry point
│   ├── models/                # MongoDB Schema Models
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Chat.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── AdminAction.js
│   │   └── Setting.js
│   ├── routes/                # API Endpoints
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── posts.js
│   │   ├── chats.js
│   │   ├── notifications.js
│   │   └── admin.js
│   └── middleware/
│       └── auth.js            # JWT Validation and Role Verification
└── client/                    # React (Vite) Frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css          # Core CSS variables, typography, layout & visual design system
        ├── context/
        │   ├── AuthContext.jsx       # Auth State & JWT token handling
        │   └── SocketContext.jsx     # Global Socket.io connections & events
        ├── components/
        │   ├── Navbar.jsx            # Dynamic navigation header
        │   ├── Sidebar.jsx           # Feed, Chat, Profile, Admin routes
        │   ├── Banner.jsx            # Founder announcement display
        │   └── PostCard.jsx          # Live post visualizer with quick actions
        ├── pages/
        │   ├── Login.jsx             # Beautiful glassmorphic auth page
        │   ├── Register.jsx
        │   ├── Feed.jsx              # Real-time post interactions
        │   ├── Chat.jsx              # Private & Group chat UI with typing/online tags
        │   ├── Profile.jsx           # User profiles, bios, interests, location
        │   ├── About.jsx             # Founder profile for Mr. Lalan Kumar
        │   └── Admin/
        │       ├── Dashboard.jsx     # Grid analytics, live chart, quick actions
        │       ├── Users.jsx         # Search/Filter, mute/ban, promotion dashboard
        │       ├── Content.jsx       # Moderator reports review system
        │       ├── Settings.jsx      # Feature toggles & announcement management
        │       └── Logs.jsx          # Audit actions and security audit log view
```

---

## 1. Backend Design

### Database Schemas

1. **User Schema (`models/User.js`)**
   - `username`: String (Unique, Indexed)
   - `email`: String (Unique, Indexed)
   - `passwordHash`: String
   - `avatar`: String (Initials placeholder or avatar URL)
   - `bio`: String
   - `location`: String (e.g. "Gujarat")
   - `interests`: [String] (e.g. ["Coding", "Design"])
   - `role`: String ('user', 'moderator', 'admin', 'founder')
   - `status`: String ('active', 'muted', 'banned', 'shadowbanned')
   - `followers`: [ObjectId -> User]
   - `following`: [ObjectId -> User]
   - `online`: Boolean
   - `lastSeen`: Date
   - `createdAt`: Date

2. **Post Schema (`models/Post.js`)**
   - `author`: ObjectId -> User (Populated)
   - `text`: String
   - `mediaUrl`: String (Optional image)
   - `likes`: [ObjectId -> User]
   - `comments`: [{ author: ObjectId -> User, text: String, createdAt: Date }]
   - `sharesCount`: Number
   - `reports`: [{ reporter: ObjectId -> User, reason: String, createdAt: Date }]
   - `hidden`: Boolean (Admin hide/unhide)
   - `featured`: Boolean (Featured posts)
   - `createdAt`: Date

3. **Chat Schema (`models/Chat.js`)**
   - `name`: String (For group chat name)
   - `isGroup`: Boolean
   - `participants`: [ObjectId -> User]
   - `creator`: ObjectId -> User (Group owner)
   - `createdAt`: Date

4. **Message Schema (`models/Message.js`)**
   - `chatId`: ObjectId -> Chat
   - `sender`: ObjectId -> User
   - `text`: String
   - `mediaUrl`: String (Optional image upload override)
   - `readBy`: [ObjectId -> User]
   - `createdAt`: Date

5. **Notification Schema (`models/Notification.js`)**
   - `recipient`: ObjectId -> User
   - `sender`: ObjectId -> User
   - `type`: String ('message', 'follow', 'like', 'comment', 'announcement')
   - `data`: Schema.Types.Mixed (e.g., postId, chatId, text content)
   - `isRead`: Boolean
   - `createdAt`: Date

6. **AdminAction Schema (`models/AdminAction.js`)**
   - `admin`: ObjectId -> User
   - `actionType`: String ('ban', 'unban', 'mute', 'unmute', 'delete_post', 'feature_post', 'hide_post', 'toggle_feature', 'update_setting', 'promote')
   - `target`: String (Identifier/Name of target)
   - `targetModel`: String ('User', 'Post', 'Setting')
   - `reason`: String
   - `timestamp`: Date

7. **Setting Schema (`models/Setting.js`)**
   - `key`: String (Unique)
   - `value`: Schema.Types.Mixed
   - `updatedAt`: Date

### Socket.io Events Implementation
- **Connection**: Track user presence; toggle `online: true` on DB, broadcast status updates.
- **Typing Indicator**: `typing` / `stop_typing` events, routing to room/private chat.
- **Posts**: Emit `post_created`, `post_updated` (likes, comments) to all connected clients.
- **Chat**: Join room (`join_chat`); emit `new_message` to participants; handle read updates.
- **Notifications**: Send `notification_received` directly to target user if online.
- **Admin Monitoring**: Emit `admin_stats_update` periodically or on changes, updating live user counters.

---

## 2. Frontend Design

### Visual Identity
- **Palette**: Deep slate background (`#0b0f19`), rich dark blue cards with backdrop blur (`rgba(17, 24, 39, 0.7)`), cyan accents (`#00f0ff`), and violet accents (`#8b5cf6`).
- **Layout**: Flexible sidebar navigation, main body panel, and a collapsible notifications/users side drawer.
- **Admin Dashboard**: Live numerical counters, a live action feed showing audit logs scrolling in real-time, interactive grids to filter/mute/ban users, and a "Messages per minute" chart (mocked/simulated dynamically using canvas/SVG to avoid heavy external charting packages).

---

## Verification Plan

### Automated Verification
1. We will verify the backend routes by starting the server and making HTTP requests.
2. We will run tests if we establish any, but primarily rely on full application operation.

### Manual Verification
1. Open the web interface using the `browser_subagent` or load it locally.
2. Register multiple users (e.g., standard users, a Moderator, and the Founder Mr. Lalan Kumar).
3. Test post creation, commenting, liking, and real-time reflection across tabs.
4. Test real-time 1-to-1 chat and group chat, typing indicator, and online/offline status toggling.
5. Open the Admin Dashboard:
   - Perform user ban/mute actions and verify impact.
   - Run moderation reports: delete/shadow-ban posts, mark as safe.
   - Configure global settings (toggle image uploads, adjust announcement banner) and watch standard users react instantly.
   - Inspect administrative action audit logs and failed login logs.
