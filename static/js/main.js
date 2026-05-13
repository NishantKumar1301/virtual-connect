// VirtualConnect — Global JS utilities

// Toast notification
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Copy room code helper
function copyCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => showToast('Room code copied: ' + code));
  } else {
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Room code copied: ' + code);
  }
}

// Nav mobile toggle
const navToggle = document.getElementById('navToggle');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    if (links) {
      const isOpen = links.style.display === 'flex';
      links.style.display = isOpen ? '' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '64px';
      links.style.left = '0';
      links.style.right = '0';
      links.style.background = 'rgba(8,9,18,0.98)';
      links.style.padding = '1rem 1.5rem';
      links.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      links.style.zIndex = '100';
    }
  });
}

// Auto-dismiss alerts
document.querySelectorAll('.alert').forEach(alert => {
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.5s';
    setTimeout(() => alert.remove(), 500);
  }, 5000);
});

// Feature card animation on scroll
function animateOnScroll() {
  const cards = document.querySelectorAll('.feature-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || 0);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
}

// Tab uppercase room code input
document.querySelectorAll('input[name="room_code"]').forEach(input => {
  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  animateOnScroll();

  // Smooth counter animation for stats (home page)
  document.querySelectorAll('.stat-value').forEach(el => {
    const text = el.textContent;
    const num = parseInt(text);
    if (!isNaN(num) && num > 0) {
      let current = 0;
      const step = Math.max(1, Math.floor(num / 40));
      const interval = setInterval(() => {
        current = Math.min(current + step, num);
        el.textContent = current + text.replace(/[0-9]/g, '');
        if (current >= num) clearInterval(interval);
      }, 30);
    }
  });
});
