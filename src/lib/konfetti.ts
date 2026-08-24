// Konfetti burst helper — CSS-only particles, no deps
// ponytail: 30 particles, increase if density needed

export function burstKonfetti(originEl?: HTMLElement) {
  const colors = ['#4f46e5', '#818cf8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const shapes = ['2px', '4px', '6px'];
  const count = 35;

  const rect = originEl?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.3;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'konfetti-particle';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = shapes[Math.floor(Math.random() * shapes.length)];
    const spread = (Math.random() - 0.5) * window.innerWidth * 0.8;
    const duration = 1.5 + Math.random() * 1.5;
    const delay = Math.random() * 0.4;

    el.style.cssText = `
      left: ${cx + spread * 0.1}px;
      top: ${cy}px;
      width: ${size};
      height: calc(${size} * 2);
      background: ${color};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      transform: translateX(${spread}px);
    `;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay + 0.1) * 1000);
  }
}
