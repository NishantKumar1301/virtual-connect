from django.contrib import admin
from .models import Conference, Participant, ChatMessage


@admin.register(Conference)
class ConferenceAdmin(admin.ModelAdmin):
    list_display = ['title', 'host', 'room_code', 'scheduled_at', 'is_active', 'max_participants']
    search_fields = ['title', 'room_code', 'host__username']
    list_filter = ['is_active', 'scheduled_at']
    readonly_fields = ['room_code', 'created_at']


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'conference', 'role', 'joined_at']
    list_filter = ['role']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'conference', 'message', 'timestamp']
    readonly_fields = ['timestamp']
