import Phaser from "phaser";
import type { StageBounds, StageEdge } from "../data/StageData";

const WALL = 28;
const BORDER_COLOR = 0xd4af37;
const BLOCK_COLOR = 0x07090c;

export interface BorderGate {
  edge: StageEdge;
  alongMin: number;
  alongMax: number;
}

/**
 * Draws the main-room gold border and solid edge blockers.
 * Permanent gaps = edge exits. Reserved gates open after a secret breaks.
 */
export class PlayFrame {
  private readonly gateBlocks = new Map<string, Phaser.GameObjects.Rectangle>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly frame: StageBounds,
    private readonly platforms: Phaser.Physics.Arcade.StaticGroup,
    permanentGaps: BorderGate[] = [],
    reservedGates: { id: string; gate: BorderGate }[] = [],
  ) {
    this.drawBorder();
    const byEdge: Record<StageEdge, BorderGate[]> = {
      left: [],
      right: [],
      top: [],
      bottom: [],
    };
    for (const gap of permanentGaps) {
      byEdge[gap.edge].push(gap);
    }
    for (const edge of ["left", "right", "top", "bottom"] as StageEdge[]) {
      this.buildEdge(edge, byEdge[edge], reservedGates.filter((g) => g.gate.edge === edge));
    }
  }

  openGate(id: string): void {
    const block = this.gateBlocks.get(id);
    if (!block) {
      return;
    }
    block.setActive(false).setVisible(false);
    if (block.body) {
      this.scene.physics.world.disable(block);
    }
  }

  private drawBorder(): void {
    const g = this.scene.add.graphics().setDepth(12);
    const { x, y, width, height } = this.frame;
    g.lineStyle(3, BORDER_COLOR, 0.9);
    g.strokeRect(x + 2, y + 2, width - 4, height - 4);
    g.lineStyle(2, 0xffe08a, 0.95);
    const t = 20;
    g.strokeRect(x, y, t, t);
    g.strokeRect(x + width - t, y, t, t);
    g.strokeRect(x, y + height - t, t, t);
    g.strokeRect(x + width - t, y + height - t, t, t);
  }

  private buildEdge(edge: StageEdge, permanent: BorderGate[], gates: { id: string; gate: BorderGate }[]): void {
    const { x, y, width, height } = this.frame;
    const origin = edge === "left" || edge === "right" ? y : x;
    const span = edge === "left" || edge === "right" ? height : width;

    const openBands = [
      ...permanent.map((g) => ({ start: g.alongMin, end: g.alongMax, gateId: null as string | null })),
      ...gates.map((g) => ({ start: g.gate.alongMin, end: g.gate.alongMax, gateId: g.id as string | null })),
    ]
      .map((b) => ({
        start: Math.max(origin, b.start),
        end: Math.min(origin + span, b.end),
        gateId: b.gateId,
      }))
      .filter((b) => b.end - b.start > 4)
      .sort((a, b) => a.start - b.start);

    let cursor = origin;
    for (const band of openBands) {
      if (band.start > cursor + 4) {
        this.placeSegment(edge, cursor - origin, band.start - cursor);
      }
      if (band.gateId) {
        // Gate stays solid until openGate.
        const block = this.placeSegment(edge, band.start - origin, band.end - band.start);
        this.gateBlocks.set(band.gateId, block);
      }
      cursor = Math.max(cursor, band.end);
    }
    if (cursor < origin + span - 4) {
      this.placeSegment(edge, cursor - origin, origin + span - cursor);
    }
  }

  private placeSegment(edge: StageEdge, along: number, length: number): Phaser.GameObjects.Rectangle {
    const { x, y, width, height } = this.frame;
    let cx = 0;
    let cy = 0;
    let w = WALL;
    let h = WALL;
    if (edge === "left") {
      cx = x - WALL / 2;
      cy = y + along + length / 2;
      h = length;
    } else if (edge === "right") {
      cx = x + width + WALL / 2;
      cy = y + along + length / 2;
      h = length;
    } else if (edge === "top") {
      cx = x + along + length / 2;
      cy = y - WALL / 2;
      w = length;
    } else {
      cx = x + along + length / 2;
      cy = y + height + WALL / 2;
      w = length;
    }
    const block = this.scene.add.rectangle(cx, cy, w, h, BLOCK_COLOR, 0.001).setDepth(11);
    this.platforms.add(block);
    return block;
  }
}

export function gapsFromEdgeExits(
  exits: { edge: StageEdge; alongMin?: number; alongMax?: number }[],
  frame: StageBounds,
): BorderGate[] {
  return exits.map((exit) => {
    if (exit.edge === "left" || exit.edge === "right") {
      return {
        edge: exit.edge,
        alongMin: exit.alongMin ?? frame.y,
        alongMax: exit.alongMax ?? frame.y + frame.height,
      };
    }
    return {
      edge: exit.edge,
      alongMin: exit.alongMin ?? frame.x,
      alongMax: exit.alongMax ?? frame.x + frame.width,
    };
  });
}
