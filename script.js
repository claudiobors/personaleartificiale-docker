const canvas = document.querySelector("#signalField");
const context = canvas?.getContext("2d");

const palette = ["#84ffc9", "#8fb9ff", "#ff8f70", "#d6bd74"];
let points = [];
let animationFrame = 0;

function resize() {
  if (!canvas || !context) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.max(34, Math.floor((window.innerWidth * window.innerHeight) / 28000));
  points = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.38,
    vy: (Math.random() - 0.5) * 0.38,
    color: palette[index % palette.length]
  }));
}

function draw() {
  if (!canvas || !context) return;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;

    if (point.x < -20) point.x = window.innerWidth + 20;
    if (point.x > window.innerWidth + 20) point.x = -20;
    if (point.y < -20) point.y = window.innerHeight + 20;
    if (point.y > window.innerHeight + 20) point.y = -20;
  }

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 160) {
        context.globalAlpha = (1 - distance / 160) * 0.26;
        context.strokeStyle = a.color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }
  }

  for (const point of points) {
    context.globalAlpha = 0.8;
    context.fillStyle = point.color;
    context.beginPath();
    context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  animationFrame = requestAnimationFrame(draw);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  resize();
  draw();
  window.addEventListener("resize", resize);
} else if (animationFrame) {
  cancelAnimationFrame(animationFrame);
}
