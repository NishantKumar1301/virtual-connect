from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    organization = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} Profile'

    @property
    def avatar_url(self):
        return self.avatar.url if self.avatar else None

    @property
    def display_name(self):
        full = f'{self.user.first_name} {self.user.last_name}'.strip()
        return full or self.user.username


@receiver(post_save, sender=User)
def create_or_save_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        instance.profile.save()
