from django import forms
from .models import Conference


class ConferenceForm(forms.ModelForm):
    scheduled_at = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={'type': 'datetime-local', 'class': 'form-control'}),
        input_formats=['%Y-%m-%dT%H:%M'],
    )

    class Meta:
        model = Conference
        fields = ['title', 'description', 'scheduled_at', 'max_participants', 'password']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Conference title'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Brief description (optional)'}),
            'max_participants': forms.NumberInput(attrs={'class': 'form-control', 'min': 2, 'max': 50}),
            'password': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Leave blank for public conference'}),
        }


class JoinConferenceForm(forms.Form):
    room_code = forms.CharField(
        max_length=10,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter room code (e.g. AB12CD34)', 'style': 'text-transform:uppercase'})
    )
    password = forms.CharField(
        max_length=50,
        required=False,
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password (if required)'})
    )
