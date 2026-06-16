/** @jsxImportSource @opentui/solid */
import { onMount, onCleanup, createSignal } from "solid-js";
import { useRenderer, extend } from "@opentui/solid";
import {
  FrameBufferRenderable,
  RGBA,
  type RenderContext,
  type FrameBufferOptions,
} from "@opentui/core";
import { Jimp } from "jimp";

interface ImageData {
  pixels: Uint8Array;
  width: number;
  height: number;
}

class ImageRenderable extends FrameBufferRenderable {
  private imageData: ImageData | null = null;

  constructor(ctx: RenderContext, options: FrameBufferOptions) {
    const width = options.width || 1;
    const height = options.height || 1;
    super(ctx, { ...options, width, height, respectAlpha: true });
  }

  public loadImage(imageData: ImageData, targetW: number, targetH: number): void {
    this.imageData = imageData;
    this.frameBuffer.resize(targetW, targetH);
    this.drawImage();
  }

  private drawImage(): void {
    if (!this.imageData) return;

    const imgW = this.imageData.width;
    const imgH = this.imageData.height;
    const bufW = this.frameBuffer.width;
    const bufH = this.frameBuffer.height;
    const fb = this.frameBuffer;
    const pixels = this.imageData.pixels;

    // Half-block rendering: each terminal row = 2 pixel rows
    for (let row = 0; row < bufH; row++) {
      const pyTop = Math.min(Math.floor((row / bufH) * imgH), imgH - 1);
      const pyBot = Math.min(Math.floor(((row + 0.5) / bufH) * imgH), imgH - 1);

      for (let col = 0; col < bufW; col++) {
        const px = Math.min(Math.floor((col / bufW) * imgW), imgW - 1);

        const topIdx = (pyTop * imgW + px) * 4;
        const botIdx = (pyBot * imgW + px) * 4;

        const tR = pixels[topIdx] ?? 0;
        const tG = pixels[topIdx + 1] ?? 0;
        const tB = pixels[topIdx + 2] ?? 0;
        const tA = pixels[topIdx + 3] ?? 255;

        const bR = pixels[botIdx] ?? 0;
        const bG = pixels[botIdx + 1] ?? 0;
        const bB = pixels[botIdx + 2] ?? 0;
        const bA = pixels[botIdx + 3] ?? 255;

        const topVisible = tA >= 128;
        const botVisible = bA >= 128;

        let char: string;
        let fg: RGBA;
        let bg: RGBA;

        if (topVisible && botVisible) {
          char = "▀";
          fg = RGBA.fromInts(tR, tG, tB, 255);
          bg = RGBA.fromInts(bR, bG, bB, 255);
        } else if (topVisible) {
          char = "▀";
          fg = RGBA.fromInts(tR, tG, tB, 255);
          bg = RGBA.defaultBackground();
        } else if (botVisible) {
          char = "▄";
          fg = RGBA.fromInts(bR, bG, bB, 255);
          bg = RGBA.defaultBackground();
        } else {
          char = " ";
          fg = RGBA.defaultForeground();
          bg = RGBA.defaultBackground();
        }

        fb.setCell(col, row, char, fg, bg);
      }
    }
  }
}

extend({ image_view: ImageRenderable });

interface ImageProps {
  src: string;
  width?: number;
  maxHeight?: number;
}

export function Image(props: ImageProps) {
  const renderer = useRenderer();
  const [loaded, setLoaded] = createSignal(false);
  let renderableRef: ImageRenderable | null = null;

  onMount(async () => {
    try {
      const file = Bun.file(props.src);
      if (!(await file.exists())) {
        console.error("[Image] File not found:", props.src);
        return;
      }

      const buffer = await file.arrayBuffer();
      const image = await Jimp.read(buffer);
      const imgW = image.bitmap.width;
      const imgH = image.bitmap.height;
      const pixels = new Uint8Array(image.bitmap.data);

      if (renderableRef) {
        const targetW = props.width ?? 20;
        const aspectRatio = imgH / imgW;
        let targetH = Math.max(1, Math.round(targetW * aspectRatio * 0.5));

        if (props.maxHeight && targetH > props.maxHeight) {
          targetH = props.maxHeight;
        }

        renderableRef.loadImage({ pixels, width: imgW, height: imgH }, targetW, targetH);
        setLoaded(true);
      }
    } catch (error) {
      console.error("[Image] Failed to load:", error);
    }
  });

  onCleanup(() => {
    renderableRef = null;
  });

  return (
    <image_view
      ref={(el: ImageRenderable) => {
        renderableRef = el;
      }}
      id={`image-${Math.random().toString(36).slice(2, 8)}`}
      width={props.width ?? 20}
      height={1}
    />
  );
}
