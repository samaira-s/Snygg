/**
 * Highly optimized, responsive canvas-based confetti burst.
 * Zero external dependencies, pure standard canvas APIs for native high performance.
 */
export const triggerConfetti = () => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  resize();
  window.addEventListener('resize', resize);

  interface Particle {
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
    shape: 'circle' | 'square' | 'triangle';
  }

  const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#f43f5e'];
  const particles: Particle[] = [];
  const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];

  // Add bursts of particles
  const addParticles = (x: number, y: number, angle: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const theta = angle + (Math.random() - 0.5) * 0.9;
      const velocity = 12 + Math.random() * 22;
      particles.push({
        x,
        y,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.cos(theta) * velocity,
        speedY: Math.sin(theta) * velocity,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      });
    }
  };

  // Launch from left and right bottom corners
  addParticles(0, canvas.height, -Math.PI / 4, 75);
  addParticles(canvas.width, canvas.height, -3 * Math.PI / 4, 75);

  const gravity = 0.45;
  const friction = 0.975;

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.speedY += gravity;
      p.speedX *= friction;
      p.speedY *= friction;
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Remove particles falling out of screen
      if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      window.removeEventListener('resize', resize);
      canvas.remove();
    }
  };

  animate();
};
