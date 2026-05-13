from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from conferences import views as conf_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', conf_views.home, name='home'),
    path('accounts/', include('accounts.urls')),
    path('dashboard/', conf_views.dashboard, name='dashboard'),
    path('conferences/', include('conferences.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
