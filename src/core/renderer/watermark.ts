import type { ResolvedWatermarkConfig } from '../types';

const X_PADDING = 24;
const Y_PADDING = 36;
const TEXT_HEIGHT = 32;
const DEFAULT_TEXT_WIDTH = 200;

export class WatermarkRenderer {
  private state = {
    x: X_PADDING,
    y: Y_PADDING,
    lastJumpTime: 0,
  };

  constructor(private config: ResolvedWatermarkConfig) {}

  public updateConfig(config: ResolvedWatermarkConfig): void {
    this.config = config;
  }

  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timestamp: number): void {
    if (!this.config.enabled) {
      return;
    }

    if (timestamp - this.state.lastJumpTime >= this.config.jumpIntervalMs) {
      this.reposition(canvas, ctx);
      this.state.lastJumpTime = timestamp;
    }

    ctx.save();
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textBaseline = 'top';
    ctx.fillText(this.config.text, this.state.x, this.state.y);
    ctx.restore();
  }

  private reposition(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const measuredWidth = ctx.measureText(this.config.text).width || DEFAULT_TEXT_WIDTH;
    const maxX = Math.max(X_PADDING, canvas.width - measuredWidth - X_PADDING);
    const maxY = Math.max(Y_PADDING, canvas.height - TEXT_HEIGHT - Y_PADDING);

    this.state.x = randomBetween(X_PADDING, maxX);
    this.state.y = randomBetween(Y_PADDING, maxY);
  }
}

function randomBetween(min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return min + Math.random() * (max - min);
}
