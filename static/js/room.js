/**
 * VirtualConnect — Conference Room
 * Handles WebRTC peer connections and WebSocket signaling
 */

class ConferenceRoom {
  constructor(roomCode, username, wsUrl) {
    this.roomCode = roomCode;
    this.username = username;
    this.wsUrl = wsUrl;

    this.socket = null;
    this.localStream = null;
    this.peers = {};       // { username: RTCPeerConnection }
    this.streams = {};     // { username: MediaStream }

    this.isMuted = false;
    this.isVideoOff = false;
    this.isSharing = false;
    this.screenStream = null;

    this.startTime = Date.now();
    this.sidebarOpen = true;

    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ]
    };
  }

  async init() {
    this.startTimer();
    await this.getLocalMedia();
    this.connectSocket();
  }

  // ---- Media ----

  async getLocalMedia() {
    const spinner = document.getElementById('localSpinner');
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      const localVideo = document.getElementById('localVideo');
      localVideo.srcObject = this.localStream;
      if (spinner) spinner.classList.add('hidden');
    } catch (err) {
      console.warn('Media access denied or unavailable:', err);
      if (spinner) spinner.classList.add('hidden');
      document.getElementById('noMediaBanner')?.classList.remove('hidden');
      // Create empty stream so peer connections still work
      this.localStream = new MediaStream();
    }
  }

  // ---- WebSocket ----

  connectSocket() {
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      this.setStatus('connected', 'Connected');
    };

    this.socket.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('WS message parse error', e);
      }
    };

    this.socket.onclose = () => {
      this.setStatus('disconnected', 'Disconnected');
      this.showToast('Connection lost. Please refresh to reconnect.');
    };

    this.socket.onerror = () => {
      this.setStatus('disconnected', 'Connection error');
    };
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // ---- Message Router ----

  async handleMessage(data) {
    switch (data.type) {
      case 'existing_users':
        // Initiate calls to everyone already in the room
        for (const user of data.users) {
          if (user !== this.username) {
            await this.createPeerConnection(user, true);
          }
        }
        break;

      case 'user_joined':
        if (data.username !== this.username) {
          this.showToast(`${data.username} joined`);
          // They will initiate; we just wait for their offer
          // But also prepare a connection in case of race
        }
        break;

      case 'user_left':
        this.showToast(`${data.username} left`);
        this.removePeer(data.username);
        break;

      case 'participant_list':
        this.updateParticipantList(data.participants);
        break;

      case 'offer':
        await this.handleOffer(data);
        break;

      case 'answer':
        await this.handleAnswer(data);
        break;

      case 'ice_candidate':
        await this.handleIceCandidate(data);
        break;

      case 'chat_message':
        this.displayChatMessage(data);
        break;

      case 'emoji_reaction':
        this.showFloatingEmoji(data.emoji, data.username);
        break;

      case 'raise_hand':
        this.handleRaiseHand(data);
        break;
    }
  }

  // ---- WebRTC ----

  async createPeerConnection(remoteUser, isInitiator) {
    if (this.peers[remoteUser]) {
      this.peers[remoteUser].close();
    }

    const pc = new RTCPeerConnection(this.iceConfig);
    this.peers[remoteUser] = pc;

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Remote stream handler
    const remoteStream = new MediaStream();
    this.streams[remoteUser] = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      this.addRemoteVideo(remoteUser, remoteStream);
    };

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice_candidate',
          candidate: event.candidate,
          to: remoteUser
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(remoteUser);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send({ type: 'offer', offer: pc.localDescription, to: remoteUser });
    }

    return pc;
  }

  async handleOffer(data) {
    const pc = await this.createPeerConnection(data.from, false);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.send({ type: 'answer', answer: pc.localDescription, to: data.from });
  }

  async handleAnswer(data) {
    const pc = this.peers[data.from];
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  }

  async handleIceCandidate(data) {
    const pc = this.peers[data.from];
    if (pc && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        // Non-fatal ICE errors
      }
    }
  }

  // ---- Video Grid ----

  addRemoteVideo(username, stream) {
    const existingTile = document.getElementById(`tile-${username}`);
    if (existingTile) {
      existingTile.querySelector('video').srcObject = stream;
      return;
    }

    const tile = document.createElement('div');
    tile.className = 'video-tile remote-tile';
    tile.id = `tile-${username}`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';

    const nameEl = document.createElement('span');
    nameEl.className = 'participant-name';
    nameEl.textContent = username;

    overlay.appendChild(nameEl);
    tile.appendChild(video);
    tile.appendChild(overlay);

    document.getElementById('videoGrid').appendChild(tile);
    this.updateGridLayout();
  }

  removePeer(username) {
    const pc = this.peers[username];
    if (pc) {
      pc.close();
      delete this.peers[username];
    }
    delete this.streams[username];

    const tile = document.getElementById(`tile-${username}`);
    if (tile) {
      tile.style.opacity = '0';
      tile.style.transition = 'opacity 0.3s';
      setTimeout(() => { tile.remove(); this.updateGridLayout(); }, 300);
    }
  }

  updateGridLayout() {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    const count = grid.querySelectorAll('.video-tile').length;
    grid.className = 'video-grid';
    if (count === 1) grid.classList.add('grid-1');
    else if (count === 2) grid.classList.add('grid-2');
    else if (count <= 4) grid.classList.add('grid-4');
    else if (count <= 6) grid.classList.add('grid-6');
    else grid.classList.add('grid-many');
  }

  // ---- Controls ----

  toggleMute() {
    const audioTracks = this.localStream?.getAudioTracks() || [];
    if (audioTracks.length === 0) {
      this.showToast('No microphone detected');
      return;
    }
    this.isMuted = !this.isMuted;
    audioTracks.forEach(t => { t.enabled = !this.isMuted; });

    const btn = document.getElementById('muteBtn');
    const icon = document.getElementById('localMutedIcon');
    if (this.isMuted) {
      btn?.classList.add('muted');
      icon?.classList.remove('hidden');
      document.querySelector('#muteBtn .ctrl-label').textContent = 'Unmute';
    } else {
      btn?.classList.remove('muted');
      icon?.classList.add('hidden');
      document.querySelector('#muteBtn .ctrl-label').textContent = 'Mute';
    }
    document.getElementById('myMicStatus').textContent = this.isMuted ? '🔇' : '🎤';
  }

  toggleVideo() {
    const videoTracks = this.localStream?.getVideoTracks() || [];
    if (videoTracks.length === 0) {
      this.showToast('No camera detected');
      return;
    }
    this.isVideoOff = !this.isVideoOff;
    videoTracks.forEach(t => { t.enabled = !this.isVideoOff; });

    const btn = document.getElementById('videoBtn');
    const icon = document.getElementById('localVideoOffIcon');
    if (this.isVideoOff) {
      btn?.classList.add('video-off');
      icon?.classList.remove('hidden');
      document.querySelector('#videoBtn .ctrl-label').textContent = 'Start Video';
    } else {
      btn?.classList.remove('video-off');
      icon?.classList.add('hidden');
      document.querySelector('#videoBtn .ctrl-label').textContent = 'Video';
    }
  }

  async toggleScreenShare() {
    if (this.isSharing) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      }

      // Show screen in local tile
      document.getElementById('localVideo').srcObject = this.screenStream;
      this.isSharing = true;

      const btn = document.getElementById('shareBtn');
      btn?.classList.add('sharing');
      document.querySelector('#shareBtn .ctrl-label').textContent = 'Stop Share';

      // Auto-stop when user closes browser's native share UI
      screenTrack.onended = () => this.stopScreenShare();

      this.showToast('Screen sharing started');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        this.showToast('Could not start screen share');
      }
    }
  }

  // ---- Raise Hand ----

  toggleHand() {
    this.handRaised = !this.handRaised;
    this.send({ type: 'raise_hand', raised: this.handRaised });
    const btn = document.getElementById('handBtn');
    if (this.handRaised) {
      btn?.classList.add('active');
      document.querySelector('#handBtn .ctrl-label').textContent = 'Lower';
      this.showToast('You raised your hand ✋ — everyone can see it');
    } else {
      btn?.classList.remove('active');
      document.querySelector('#handBtn .ctrl-label').textContent = 'Hand';
    }
    // Update own entry in participants list
    const myStatus = document.getElementById('myMicStatus');
    if (myStatus) myStatus.textContent = this.handRaised ? '✋' : (this.isMuted ? '🔇' : '🎤');
  }

  handleRaiseHand(data) {
    // Update participant list indicator
    const item = document.getElementById(`p-${data.username}`);
    if (item) {
      const icon = item.querySelector('.p-icon');
      if (icon) icon.textContent = data.raised ? '✋' : '🎤';
    }
    if (data.raised) {
      this.showToast(`${data.username} raised their hand ✋`);
      // Also show a floating notification on the video tile
      const tile = document.getElementById(`tile-${data.username}`);
      if (tile) {
        let badge = tile.querySelector('.hand-badge');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'hand-badge';
          tile.appendChild(badge);
        }
        badge.textContent = '✋';
      }
    } else {
      const tile = document.getElementById(`tile-${data.username}`);
      tile?.querySelector('.hand-badge')?.remove();
    }
  }

  // ---- Emoji Reactions ----

  sendReaction(emoji) {
    this.send({ type: 'emoji_reaction', emoji });
    this.showFloatingEmoji(emoji, 'You');
    this.toggleEmojiBar(false);
  }

  showFloatingEmoji(emoji, username) {
    const container = document.getElementById('reactionContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    // Random horizontal spread
    el.style.left = (10 + Math.random() * 75) + '%';
    el.innerHTML = `<span class="fe-emoji">${emoji}</span><span class="fe-name">${username === this.username ? 'You' : username}</span>`;
    container.appendChild(el);
    // Remove after animation ends
    setTimeout(() => el.remove(), 3200);
  }

  toggleEmojiBar(forceClose) {
    const bar = document.getElementById('emojiBar');
    if (!bar) return;
    if (forceClose === false) {
      bar.classList.remove('visible');
    } else {
      bar.classList.toggle('visible');
    }
  }

  async stopScreenShare() {
    if (!this.isSharing) return;

    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    this.isSharing = false;

    // Restore camera track in all peers
    const cameraTrack = this.localStream?.getVideoTracks()[0];
    if (cameraTrack) {
      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraTrack);
      }
    }

    document.getElementById('localVideo').srcObject = this.localStream;

    const btn = document.getElementById('shareBtn');
    btn?.classList.remove('sharing');
    document.querySelector('#shareBtn .ctrl-label').textContent = 'Share';
    this.showToast('Screen sharing stopped');
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    const sidebar = document.getElementById('roomSidebar');
    if (!sidebar) return;

    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open', this.sidebarOpen);
    } else {
      sidebar.classList.toggle('collapsed', !this.sidebarOpen);
    }
  }

  leave() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.screenStream?.getTracks().forEach(t => t.stop());
    Object.values(this.peers).forEach(pc => pc.close());
    this.socket?.close();
    window.location.href = '/dashboard/';
  }

  // ---- Chat ----

  sendChat(message) {
    if (!message.trim()) return;
    this.send({ type: 'chat_message', message: message.trim() });
    // Display own message immediately
    this.displayChatMessage({
      username: this.username,
      message: message.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });
  }

  displayChatMessage(data) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const isOwn = data.username === this.username;
    const div = document.createElement('div');
    div.className = `chat-msg ${isOwn ? 'own' : ''}`;

    const who = document.createElement('span');
    who.className = 'chat-who';
    who.textContent = isOwn ? 'You' : data.username;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = data.message;

    const ts = document.createElement('span');
    ts.className = 'chat-ts';
    ts.textContent = data.time || '';

    div.appendChild(who);
    div.appendChild(bubble);
    div.appendChild(ts);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Show unread badge if on participants tab
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel?.classList.contains('hidden') && !isOwn) {
      const badge = document.getElementById('chatUnread');
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = parseInt(badge.textContent || 0) + 1;
      }
    }
  }

  // ---- Participants ----

  updateParticipantList(participants) {
    const list = document.getElementById('participantsList');
    if (!list) return;

    const countEl = document.getElementById('participantCount');
    if (countEl) countEl.textContent = participants.length;

    // Keep "You" entry, rebuild the rest
    const existing = list.querySelectorAll('.participant-item:not(.you-item)');
    existing.forEach(el => el.remove());

    participants.forEach(name => {
      if (name === this.username) return;
      const item = document.createElement('div');
      item.className = 'participant-item';
      item.id = `p-${name}`;
      const letter = name.charAt(0).toUpperCase();
      item.innerHTML = `
        <div class="p-avatar" style="background:${this.avatarColor(name)}">${letter}</div>
        <div class="p-info"><span class="p-name">${name}</span></div>
        <div class="p-status"><span class="p-icon">🎤</span></div>
      `;
      list.appendChild(item);
    });
  }

  avatarColor(name) {
    const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // ---- UI Helpers ----

  setStatus(state, text) {
    const dot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    if (dot) { dot.className = 'status-dot ' + state; }
    if (statusText) statusText.textContent = text;
  }

  showToast(message) {
    const toast = document.getElementById('roomToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  startTimer() {
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      const el = document.getElementById('roomTimer');
      if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }
}

// ---- Global helpers ----

let room;

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;
  room?.sendChat(input.value);
  input.value = '';
}

function switchTab(tabName, btn) {
  document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById(tabName + 'Panel')?.classList.remove('hidden');

  if (tabName === 'chat') {
    const badge = document.getElementById('chatUnread');
    if (badge) { badge.classList.add('hidden'); badge.textContent = '0'; }
    setTimeout(() => {
      const msgs = document.getElementById('chatMessages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }
}

function confirmLeave() {
  document.getElementById('leaveModal')?.classList.remove('hidden');
}

function closeLeaveModal() {
  document.getElementById('leaveModal')?.classList.add('hidden');
}

function copyRoomCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(ROOM_CODE).then(() => room?.showToast('Room code copied: ' + ROOM_CODE));
  }
}

// ---- Chat input Enter key ----
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  // Scroll chat to bottom on load
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;

  // Close emoji bar when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.react-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById('emojiBar')?.classList.remove('visible');
    }
  });

  // Init room
  room = new ConferenceRoom(ROOM_CODE, USERNAME, WS_URL);
  room.init().catch(console.error);
});
