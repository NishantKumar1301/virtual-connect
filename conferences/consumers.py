import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ConferenceConsumer(AsyncWebsocketConsumer):
    # Class-level room tracking: {room_code: {username: channel_name}}
    # Works for single-server deployment (Railway free tier)
    rooms = {}

    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group = f'conf_{self.room_code}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        self.username = self.user.username

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        if self.room_code not in self.rooms:
            self.rooms[self.room_code] = {}

        # Send list of currently connected users to the new joiner
        existing = list(self.rooms[self.room_code].keys())
        if existing:
            await self.send(text_data=json.dumps({
                'type': 'existing_users',
                'users': existing
            }))

        # Register this user
        self.rooms[self.room_code][self.username] = self.channel_name

        # Notify everyone else
        await self.channel_layer.group_send(self.room_group, {
            'type': 'evt_user_joined',
            'username': self.username,
        })

        # Broadcast updated participant list to all
        await self._broadcast_participants()

    async def disconnect(self, close_code):
        if self.room_code in self.rooms:
            self.rooms[self.room_code].pop(self.username, None)
            if not self.rooms[self.room_code]:
                del self.rooms[self.room_code]

        await self.channel_layer.group_send(self.room_group, {
            'type': 'evt_user_left',
            'username': self.username,
        })
        await self._broadcast_participants()
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        msg_type = data.get('type')

        if msg_type == 'offer':
            await self.channel_layer.group_send(self.room_group, {
                'type': 'evt_signal',
                'payload': {'type': 'offer', 'offer': data.get('offer'), 'from': self.username},
                'to': data.get('to'),
            })

        elif msg_type == 'answer':
            await self.channel_layer.group_send(self.room_group, {
                'type': 'evt_signal',
                'payload': {'type': 'answer', 'answer': data.get('answer'), 'from': self.username},
                'to': data.get('to'),
            })

        elif msg_type == 'ice_candidate':
            await self.channel_layer.group_send(self.room_group, {
                'type': 'evt_signal',
                'payload': {'type': 'ice_candidate', 'candidate': data.get('candidate'), 'from': self.username},
                'to': data.get('to'),
            })

        elif msg_type == 'chat_message':
            message = str(data.get('message', '')).strip()[:500]
            if message:
                await self._save_message(message)
                await self.channel_layer.group_send(self.room_group, {
                    'type': 'evt_chat',
                    'username': self.username,
                    'message': message,
                    'time': datetime.now().strftime('%H:%M'),
                })

        elif msg_type == 'emoji_reaction':
            emoji = data.get('emoji', '')
            allowed = ['👍', '❤️', '😄', '👏', '🔥', '🎉', '😮', '🙌']
            if emoji in allowed:
                await self.channel_layer.group_send(self.room_group, {
                    'type': 'evt_reaction',
                    'username': self.username,
                    'emoji': emoji,
                })

        elif msg_type == 'raise_hand':
            raised = bool(data.get('raised', True))
            await self.channel_layer.group_send(self.room_group, {
                'type': 'evt_raise_hand',
                'username': self.username,
                'raised': raised,
            })

    # ---- Channel layer event handlers ----

    async def evt_user_joined(self, event):
        if event['username'] != self.username:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'username': event['username'],
            }))

    async def evt_user_left(self, event):
        if event['username'] != self.username:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'username': event['username'],
            }))

    async def evt_participants(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_list',
            'participants': event['participants'],
        }))

    async def evt_signal(self, event):
        # Only deliver to the intended recipient
        if event.get('to') == self.username:
            await self.send(text_data=json.dumps(event['payload']))

    async def evt_chat(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'username': event['username'],
            'message': event['message'],
            'time': event['time'],
        }))

    async def evt_reaction(self, event):
        await self.send(text_data=json.dumps({
            'type': 'emoji_reaction',
            'username': event['username'],
            'emoji': event['emoji'],
        }))

    async def evt_raise_hand(self, event):
        await self.send(text_data=json.dumps({
            'type': 'raise_hand',
            'username': event['username'],
            'raised': event['raised'],
        }))

    # ---- Helpers ----

    async def _broadcast_participants(self):
        participants = list(self.rooms.get(self.room_code, {}).keys())
        await self.channel_layer.group_send(self.room_group, {
            'type': 'evt_participants',
            'participants': participants,
        })

    @database_sync_to_async
    def _save_message(self, message):
        from .models import Conference, ChatMessage
        try:
            conf = Conference.objects.get(room_code=self.room_code)
            ChatMessage.objects.create(conference=conf, user=self.user, message=message)
        except Conference.DoesNotExist:
            pass
