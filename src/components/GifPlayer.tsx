/** @jsxImportSource @opentui/solid */
import { onMount, onCleanup, createSignal } from "solid-js";
import { useRenderer, extend } from "@opentui/solid";
import {
  FrameBufferRenderable,
  RGBA,
  type RenderContext,
  type FrameBufferOptions,
} from "@opentui/core";
import { GifReader } from "omggif";

interface GifFrame {
  pixels: Uint8Array;
  delay: number;
}

interface GifData {
  width: number;
  height: number;
  frames: GifFrame[];
}

class GifPlayerRenderable extends FrameBufferRenderable {
  private gifData: GifData | null = null;
  private currentFrameIndex = 0;
  private frameTimer = 0;
  private bgR = 0;
  private bgG = 0;
  private bgB = 0;

  constructor(ctx: RenderContext, options: FrameBufferOptions & { bgColor?: string }) {
    // Reconciler may create with { id } only — ensure valid dimensions
    const width = options.width || 1;
    const height = options.height || 1;
    super(ctx, { ...options, width, height, respectAlpha: true });
    if (options.bgColor) {
      const hex = options.bgColor.replace("#", "");
      this.bgR = parseInt(hex.substring(0, 2), 16) / 255;
      this.bgG = parseInt(hex.substring(2, 4), 16) / 255;
      this.bgB = parseInt(hex.substring(4, 6), 16) / 255;
    }
  }

  public loadGif(gifData: GifData, targetW: number, targetH: number): void {
    this.gifData = gifData;
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    // Resize the underlying buffer to match calculated dimensions
    this.frameBuffer.resize(targetW, targetH);
    this.drawCurrentFrame();
  }

  private drawCurrentFrame(): void {
    if (!this.gifData || this.gifData.frames.length === 0) return;
    const frame = this.gifData.frames[this.currentFrameIndex];
    if (!frame) return;

    const gifW = this.gifData.width;
    const gifH = this.gifData.height;
    const bufW = this.frameBuffer.width;
    const bufH = this.frameBuffer.height;
    const fb = this.frameBuffer;

    // Use half-block chars (▀▄) for 2x vertical resolution
    // Each terminal row = 2 pixel rows
    const pixelRows = bufH * 2;

    for (let row = 0; row < bufH; row++) {
      const pyTop = Math.min(Math.floor((row / bufH) * gifH), gifH - 1);
      const pyBot = Math.min(Math.floor(((row + 0.5) / bufH) * gifH), gifH - 1);

      for (let col = 0; col < bufW; col++) {
        const px = Math.min(Math.floor((col / bufW) * gifW), gifW - 1);

        const topIdx = (pyTop * gifW + px) * 4;
        const botIdx = (pyBot * gifW + px) * 4;

        const tR = frame.pixels[topIdx] ?? 0;
        const tG = frame.pixels[topIdx + 1] ?? 0;
        const tB = frame.pixels[topIdx + 2] ?? 0;
        const tA = frame.pixels[topIdx + 3] ?? 255;

        const bR = frame.pixels[botIdx] ?? 0;
        const bG = frame.pixels[botIdx + 1] ?? 0;
        const bB = frame.pixels[botIdx + 2] ?? 0;
        const bA = frame.pixels[botIdx + 3] ?? 255;

        const topVisible = tA >= 128;
        const botVisible = bA >= 128;

        let char: string;
        let fg: RGBA;
        let bg: RGBA;

        if (topVisible && botVisible) {
          // Both pixels visible: fg=top, bg=bottom, char=▀
          char = "▀";
          fg = RGBA.fromInts(tR, tG, tB, 255);
          bg = RGBA.fromInts(bR, bG, bB, 255);
        } else if (topVisible) {
          // Only top visible
          char = "▀";
          fg = RGBA.fromInts(tR, tG, tB, 255);
          bg = RGBA.defaultBackground();
        } else if (botVisible) {
          // Only bottom visible
          char = "▄";
          fg = RGBA.fromInts(bR, bG, bB, 255);
          bg = RGBA.defaultBackground();
        } else {
          // Both transparent
          char = " ";
          fg = RGBA.defaultForeground();
          bg = RGBA.defaultBackground();
        }

        fb.setCell(col, row, char, fg, bg);
      }
    }
  }

  protected override onUpdate(deltaTime: number): void {
    super.onUpdate(deltaTime);
    if (!this.gifData || this.gifData.frames.length <= 1) return;

    this.frameTimer += deltaTime*5;
    const currentFrame = this.gifData.frames[this.currentFrameIndex];
    if (!currentFrame) return;

    const delayMs = currentFrame.delay * 10;
    if (this.frameTimer >= delayMs) {
      this.frameTimer = 0;
      this.currentFrameIndex =
        (this.currentFrameIndex + 1) % this.gifData.frames.length;
      this.drawCurrentFrame();
      this.requestRender();
    }
  }
}

// Register the custom element
extend({ gif_player: GifPlayerRenderable });

interface GifPlayerProps {
  src: string;
  width?: number;
  maxHeight?: number;
  bgColor?: string;
}

export function GifPlayer(props: GifPlayerProps) {
  const renderer = useRenderer();
  const [loaded, setLoaded] = createSignal(false);
  let renderableRef: GifPlayerRenderable | null = null;

  onMount(async () => {
    try {
      const file = Bun.file(props.src);
      if (!(await file.exists())) {
        console.error("[GifPlayer] GIF not found:", props.src);
        return;
      }

      const data = new Uint8Array(await file.arrayBuffer());
      const reader = new GifReader(data);
      const width = reader.width;
      const height = reader.height;
      const numFrames = reader.numFrames();
      const frames: GifFrame[] = [];

      for (let i = 0; i < numFrames; i++) {
        const pixels = new Uint8Array(width * height * 4);
        reader.decodeAndBlitFrameRGBA(i, pixels);
        let delay = 10;
        try {
          const fi = reader.frameInfo(i);
          if (fi && typeof fi.delay === "number") delay = fi.delay;
        } catch {}
        frames.push({ pixels, delay });
      }

      if (renderableRef) {
        // Calculate height from width maintaining aspect ratio
        // Terminal chars are ~2:1 (height:width), so multiply by 0.5
        const targetW = props.width ?? 20;
        const aspectRatio = height / width;
        let targetH = Math.max(1, Math.round(targetW * aspectRatio * 0.5));

        // Clamp to maxHeight if provided
        if (props.maxHeight && targetH > props.maxHeight) {
          targetH = props.maxHeight;
        }

        renderableRef.loadGif({ width, height, frames }, targetW, targetH);
        setLoaded(true);
      }
    } catch (error) {
      console.error("[GifPlayer] Failed to load GIF:", error);
    }
  });

  onCleanup(() => {
    renderableRef = null;
  });

  return (
    <gif_player
      ref={(el: GifPlayerRenderable) => {
        renderableRef = el;
      }}
      id={`gif-player-${Math.random().toString(36).slice(2, 8)}`}
      width={props.width ?? 20}
      height={1}
      live={true}
      bgColor={props.bgColor ?? "#000000"}
    />
  );
}
