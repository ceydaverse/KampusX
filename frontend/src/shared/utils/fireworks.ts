import confetti from 'canvas-confetti';

export function launchFireworks() {
  const duration = 1500;
  const animationEnd = Date.now() + duration;
  const defaults: confetti.Options = {
    startVelocity: 40,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
  };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: number = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return window.clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.5) },
    });

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.5) },
    });
  }, 200);
}

