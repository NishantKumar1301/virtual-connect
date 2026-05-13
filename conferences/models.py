import uuid
from django.db import models
from django.contrib.auth.models import User


class Conference(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_conferences')
    room_code = models.CharField(max_length=10, unique=True, db_index=True)
    scheduled_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    max_participants = models.PositiveIntegerField(default=20)
    password = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-scheduled_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.room_code:
            self.room_code = self._generate_room_code()
        super().save(*args, **kwargs)

    def _generate_room_code(self):
        while True:
            code = uuid.uuid4().hex[:8].upper()
            if not Conference.objects.filter(room_code=code).exists():
                return code

    @property
    def participant_count(self):
        return self.participants.count()

    @property
    def is_password_protected(self):
        return bool(self.password)


class Participant(models.Model):
    ROLE_HOST = 'host'
    ROLE_PARTICIPANT = 'participant'
    ROLE_CHOICES = [(ROLE_HOST, 'Host'), (ROLE_PARTICIPANT, 'Participant')]

    conference = models.ForeignKey(Conference, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conference_participations')
    joined_at = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PARTICIPANT)

    class Meta:
        unique_together = ['conference', 'user']

    def __str__(self):
        return f'{self.user.username} in {self.conference.title}'


class ChatMessage(models.Model):
    conference = models.ForeignKey(Conference, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.user.username}: {self.message[:50]}'
