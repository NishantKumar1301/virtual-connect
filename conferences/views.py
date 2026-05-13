from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Q
from .models import Conference, Participant, ChatMessage
from .forms import ConferenceForm, JoinConferenceForm


def home(request):
    total_conferences = Conference.objects.count()
    return render(request, 'home.html', {'total_conferences': total_conferences})


@login_required
def dashboard(request):
    user = request.user
    hosted = Conference.objects.filter(host=user).order_by('-created_at')
    joined = Conference.objects.filter(
        participants__user=user
    ).exclude(host=user).order_by('-scheduled_at')

    upcoming = Conference.objects.filter(
        Q(host=user) | Q(participants__user=user),
        scheduled_at__gte=timezone.now()
    ).distinct().order_by('scheduled_at')[:5]

    return render(request, 'conferences/dashboard.html', {
        'hosted': hosted,
        'joined': joined,
        'upcoming': upcoming,
        'join_form': JoinConferenceForm(),
    })


@login_required
def create_conference(request):
    if request.method == 'POST':
        form = ConferenceForm(request.POST)
        if form.is_valid():
            conf = form.save(commit=False)
            conf.host = request.user
            conf.save()
            Participant.objects.create(conference=conf, user=request.user, role=Participant.ROLE_HOST)
            messages.success(request, f'Conference created! Share room code: {conf.room_code}')
            return redirect('conference_detail', room_code=conf.room_code)
    else:
        form = ConferenceForm()
    return render(request, 'conferences/create.html', {'form': form})


@login_required
def conference_detail(request, room_code):
    conf = get_object_or_404(Conference, room_code=room_code)
    is_host = conf.host == request.user
    is_participant = Participant.objects.filter(conference=conf, user=request.user).exists()
    return render(request, 'conferences/detail.html', {
        'conference': conf,
        'is_host': is_host,
        'is_participant': is_participant,
    })


@login_required
def join_conference(request, room_code):
    conf = get_object_or_404(Conference, room_code=room_code)

    if conf.password:
        entered = request.POST.get('password', '')
        if entered != conf.password:
            messages.error(request, 'Incorrect conference password.')
            return redirect('conference_detail', room_code=room_code)

    Participant.objects.get_or_create(
        conference=conf,
        user=request.user,
        defaults={'role': Participant.ROLE_HOST if conf.host == request.user else Participant.ROLE_PARTICIPANT}
    )
    return redirect('conference_room', room_code=room_code)


@login_required
def conference_room(request, room_code):
    conf = get_object_or_404(Conference, room_code=room_code)

    # Auto-add participant (handles passwordless conferences)
    Participant.objects.get_or_create(
        conference=conf,
        user=request.user,
        defaults={'role': Participant.ROLE_HOST if conf.host == request.user else Participant.ROLE_PARTICIPANT}
    )

    chat_history = ChatMessage.objects.filter(conference=conf).select_related('user')[:100]

    return render(request, 'conferences/room.html', {
        'conference': conf,
        'chat_history': chat_history,
        'is_host': conf.host == request.user,
        'username': request.user.username,
    })


@login_required
def quick_join(request):
    if request.method == 'POST':
        form = JoinConferenceForm(request.POST)
        if form.is_valid():
            room_code = form.cleaned_data['room_code'].upper().strip()
            password = form.cleaned_data.get('password', '')
            try:
                conf = Conference.objects.get(room_code=room_code)
                if conf.password and conf.password != password:
                    messages.error(request, 'Incorrect password.')
                    return redirect('dashboard')
                return redirect('conference_room', room_code=room_code)
            except Conference.DoesNotExist:
                messages.error(request, 'Conference not found. Check your room code.')
    return redirect('dashboard')
