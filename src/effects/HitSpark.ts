import Phaser from "phaser";

interface Burst {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  life: number;
  max: number;
  rays: { angle: number; length: number }[];
}

export class HitSpark {
  private bursts: Burst[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  spawn(x: number, y: number, heavy: boolean): void {
    const count = heavy ? 12 : 8;
    const reach = heavy ? 26 : 16;
    const rays = Array.from({ length: count }, (_, index) => ({
      angle: (Math.PI * 2 * index) / count + index * 0.15,
      length: reach + (index % 3) * 5,
    }));
    const max = heavy ? 170 : 120;
    this.bursts.push({
      graphics: this.scene.add.graphics().setDepth(9),
      x,
      y,
      life: max,
      max,
      rays,
    });
  }

  update(delta: number): void {
    const alive: Burst[] = [];
    for (const burst of this.bursts) {
      burst.life -= delta;
      if (burst.life <= 0) {
        burst.graphics.destroy();
        continue;
      }
      const fade = burst.life / burst.max;
      const g = burst.graphics;
      g.clear();
      g.lineStyle(fade > 0.5 ? 3 : 2, 0xffffff, fade);
      for (const ray of burst.rays) {
        const length = ray.length * (1.55 - fade);
        g.beginPath();
        g.moveTo(burst.x, burst.y);
        g.lineTo(burst.x + Math.cos(ray.angle) * length, burst.y + Math.sin(ray.angle) * length);
        g.strokePath();
      }
      g.fillStyle(0xffffff, fade);
      g.fillCircle(burst.x, burst.y, 2 + fade * 3);
      alive.push(burst);
    }
    this.bursts = alive;
  }
}
