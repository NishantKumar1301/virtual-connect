<div align="center">

# 🎥 VirtualConnect

### Empowering Online Conferences through a Web Application

[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![Channels](https://img.shields.io/badge/Django_Channels-WebSocket-FF6B35?style=for-the-badge)](https://channels.readthedocs.io)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

<br/>

**VirtualConnect** is a full-stack online conference platform built with Django and WebRTC.  
Host HD video meetings, chat in real-time, share your screen, and collaborate remotely — all from the browser.

<br/>

[🚀 Live Demo](#-live-demo) · [✨ Features](#-features) · [🛠️ Tech Stack](#️-tech-stack) · [⚡ Quick Start](#-quick-start) · [☁️ Deploy](#️-deploy-on-railway)

---

</div>

## 📸 Preview

```
┌─────────────────────────────────────────────────────────────┐
│  🎥 VirtualConnect   [AB12CD34]      00:12:34   ● Connected │
├──────────────────────────────────────┬──────────────────────┤
│                                      │  👥 People  💬 Chat  │
│   ┌──────────────┐  ┌─────────────┐  │ ─────────────────── │
│   │   📹 Alex    │  │  📹  Sam    │  │  ● Alex K.    🎤    │
│   │              │  │             │  │  ● Sam R.     🎤    │
│   └──────────────┘  └─────────────┘  │  ● You        ✋    │
│   ┌──────────────┐                   │ ─────────────────── │
│   │  📹 You(Host)│     👍 floating   │  Alex: great call!  │
│   │              │      reactions    │  You: thanks!       │
│   └──────────────┘                   │  [Type message...] ➤│
├──────────────────────────────────────┴──────────────────────┤
│   [🎤 Mute]  [📹 Video]  [🖥 Share]  [✋ Hand]  [😊 React] │
│                                              [📞 Leave]     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🎥 Video Conferencing
- **HD WebRTC P2P video** — browser-to-browser, end-to-end encrypted
- **Mute / Unmute** microphone with visual indicator
- **Camera on/off** toggle
- **Screen sharing** — share your full screen or a specific window
- Adaptive **video grid layout** (1, 2, 4, 6+ participants)

### 💬 Real-time Communication
- **Live chat** with persistent message history per conference
- **Emoji reactions** — 👍 ❤️ 😄 👏 🔥 🎉 😮 🙌 floating animations visible to all
- **Raise Hand** ✋ — notifies everyone with a pulsing badge on your video tile

### 📅 Conference Management
- **Create & schedule** conferences with title, description, date/time
- **Password protection** for private conferences
- **Room codes** — shareable 8-character unique codes
- **Invite links** — one-click copy of full shareable URL
- **Dashboard** with search & filter (All / Hosted / Joined)
- Participant limit settings (up to 50 people)

### 🔐 User Accounts
- Register, login, logout
- Profile page with avatar, bio, organization
- Conference history and stats

### 🎨 UI / UX
- **Dark glassmorphism** design with purple/cyan gradient theme
- Fully **responsive** — works on mobile, tablet, desktop
- Animated floating elements, smooth transitions
- Live room timer, connection status indicator
- Branded **favicon** in browser tab

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 4.2, Python 3.11 |
| **Real-time** | Django Channels 4, Daphne ASGI |
| **Video** | WebRTC (browser-native, P2P) |
| **Database** | SQLite (dev) / PostgreSQL (production) |
| **Static Files** | WhiteNoise |
| **Deployment** | Railway |
| **Frontend** | Vanilla JS, CSS3 (no frameworks) |
| **Fonts** | Inter (Google Fonts) |

---

## ⚡ Quick Start

### Prerequisites
- Python 3.11+
- pip

### 1. Clone the repository
```bash
git clone https://github.com/NishantKumar1301/virtual-connect.git
cd virtual-connect
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Create environment file
Create a `.env` file in the project root:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
```

Generate a secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 4. Run migrations
```bash
python manage.py migrate
```

### 5. Create a superuser (optional)
```bash
python manage.py createsuperuser
# or quickly:
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin')"
```

### 6. Start the server
```bash
python manage.py runserver
```

Visit **http://127.0.0.1:8000** 🎉

---

## 📁 Project Structure

```
virtual-connect/
│
├── virtualconnect/          # Django project settings
│   ├── settings.py          # Configuration (env-based)
│   ├── urls.py              # Root URL routing
│   └── asgi.py              # ASGI app (HTTP + WebSocket)
│
├── accounts/                # User auth & profiles
│   ├── models.py            # Profile model
│   ├── views.py             # Register, login, profile
│   └── forms.py             # Auth forms
│
├── conferences/             # Core conference app
│   ├── models.py            # Conference, Participant, ChatMessage
│   ├── views.py             # Dashboard, room, join logic
│   ├── consumers.py         # WebSocket consumer (signaling + chat)
│   └── routing.py           # WebSocket URL patterns
│
├── templates/               # HTML templates
│   ├── base.html            # Base layout with navbar
│   ├── home.html            # Landing page
│   ├── accounts/            # Auth pages
│   └── conferences/         # Dashboard, room, detail pages
│
├── static/
│   ├── css/
│   │   ├── main.css         # Global dark theme styles
│   │   └── room.css         # Conference room styles
│   └── js/
│       ├── main.js          # Global utilities
│       └── room.js          # WebRTC + room logic
│
├── manage.py
├── requirements.txt
├── Procfile                 # Railway start command
└── railway.toml             # Railway build config
```

---

## ☁️ Deploy on Railway

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Connect to Railway
1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Choose `virtual-connect`

### 3. Add PostgreSQL (optional)
- In your project → **+ New** → **Database** → **PostgreSQL**
- `DATABASE_URL` is automatically injected

### 4. Set Environment Variables
In your service → **Variables** tab:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Generated secret key |
| `DEBUG` | `False` |

### 5. Generate Domain
**Settings** → **Networking** → **Generate Domain**

Your app is live! 🚀

---

## 🔌 WebRTC Architecture

```
Browser A  ──── WebSocket (signaling) ────  Django Channels
    │                                              │
    │         offer / answer / ICE                │
    │                                         Browser B
    │                                              │
    └──────────── P2P Video/Audio ────────────────┘
                  (direct, no server)
```

- Signaling (offer/answer/ICE candidates) goes through Django Channels WebSockets
- Actual video/audio streams flow **peer-to-peer** — zero server bandwidth cost
- STUN servers (Google's free servers) handle NAT traversal
- Works across different networks and firewalls

---

## 🌐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Production | insecure default | Django cryptographic key |
| `DEBUG` | ❌ | `False` | Enable debug mode |
| `DATABASE_URL` | ❌ | SQLite | Auto-set by Railway PostgreSQL |
| `RAILWAY_PUBLIC_DOMAIN` | ❌ | — | Auto-set by Railway |

---

## 📋 Pages & Routes

| URL | Page |
|-----|------|
| `/` | Landing page |
| `/accounts/register/` | Sign up |
| `/accounts/login/` | Sign in |
| `/accounts/profile/` | User profile |
| `/dashboard/` | Conference dashboard |
| `/conferences/create/` | Create conference |
| `/conferences/<code>/` | Conference detail |
| `/conferences/<code>/room/` | Live conference room |
| `/admin/` | Django admin panel |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ using **Django** + **WebRTC**

**[⬆ Back to top](#-virtualconnect)**

</div>
