/**
 * Particle Background Animation
 * Floating interconnected particles for premium ambient effect
 */

const Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  mouse: { x: null, y: null },
  animFrame: null,

  init() {
    this.canvas = document.getElementById('particles-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.animate();
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createParticles() {
    const count = Math.min(60, Math.floor((this.canvas.width * this.canvas.height) / 25000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.6,
        opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.6 ? 160 : 200, // green or cyan
      });
    }
  },

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  },

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Update & draw particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      // Mouse interaction — subtle push
      if (this.mouse.x !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.015;
          p.vx += dx * force;
          p.vy += dy * force;
        }
      }

      // Speed limit
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.8) {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      // Draw dot
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
      this.ctx.fill();
    }

    // Draw connections
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          const alpha = (1 - dist / 140) * 0.12;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `hsla(165, 70%, 55%, ${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }

    this.animFrame = requestAnimationFrame(() => this.animate());
  },

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  },
};
