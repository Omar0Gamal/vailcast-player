export type OverlayDrawCallback = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  timestamp: number,
) => void;

const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 720;

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly overlayDraw?: OverlayDrawCallback,
  ) {
    this.ctx = this.canvas.getContext('2d');
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.rafId = requestAnimationFrame(this.render);
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
  }

  private render = (timestamp: number): void => {
    if (!this.running || !this.ctx) {
      return;
    }

    this.syncCanvasSize();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    }

    this.overlayDraw?.(this.ctx, this.canvas, timestamp);
    this.rafId = requestAnimationFrame(this.render);
  };

  private syncCanvasSize(): void {
    const width = this.video.videoWidth || this.canvas.clientWidth || FALLBACK_WIDTH;
    const height = this.video.videoHeight || this.canvas.clientHeight || FALLBACK_HEIGHT;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}
