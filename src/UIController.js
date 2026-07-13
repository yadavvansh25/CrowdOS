export function initUI() {
// ── Mock Button & Toast System ──
  const toastContainer = document.createElement('div');
  toastContainer.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2';
  document.body.appendChild(toastContainer);

  window.showToast = function(msg) {
    const t = document.createElement('div');
    t.className = 'bg-surface-container-highest border border-primary/50 text-primary text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur transition-all duration-300 opacity-0 translate-y-4';
    t.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">info</span> ${msg}</div>`;
    toastContainer.appendChild(t);
    requestAnimationFrame(() => { t.classList.remove('opacity-0', 'translate-y-4'); });
    setTimeout(() => {
      t.classList.add('opacity-0', '-translate-y-4');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  };

  // Attach to all non-functional buttons and links
  document.querySelectorAll('button:not([id]), a[href="#"]:not(.nav-item)').forEach(el => {
    if (!el.classList.contains('layer-btn') && !el.classList.contains('quick-prompt')) {
      el.addEventListener('keydown', function(e) {
        if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
      });
      el.addEventListener('click', function(e) {
        e.preventDefault();
        const label = this.textContent.trim() || 'Action';
        showToast(`${label} executed (Mockup)`);
      });
    }
  });

  // ── Emergency Button Logic ──
  const emBtn = document.querySelector('button[aria-label="Emergency"]');
  if (emBtn) {
    emBtn.addEventListener('click', () => {
      showToast('EMERGENCY PROTOCOL ACTIVATED');
      // Flash screen border
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[150] border-[8px] border-error pointer-events-none animate-pulse';
      document.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 4000);
      
      // Switch to Incident Response tab
      const incTab = document.querySelector('.nav-item[data-tab="incident"]');
      if (incTab) incTab.click();
    });
  }

}