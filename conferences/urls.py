from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_conference, name='create_conference'),
    path('join/', views.quick_join, name='quick_join'),
    path('<str:room_code>/', views.conference_detail, name='conference_detail'),
    path('<str:room_code>/join/', views.join_conference, name='join_conference'),
    path('<str:room_code>/room/', views.conference_room, name='conference_room'),
]
