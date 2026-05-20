// Browser-side image-to-video renderer using Canvas + MediaRecorder.
// Renders Ken Burns (slow zoom/pan) on each image with crossfade transitions,
// optional title/caption overlay and background music, then captures the
// canvas stream into a WebM/MP4 blob.

export type Aspect = "vertical" | "horizontal" | "square";

export interface Slide {
  /** ObjectURL or data URL */
  src: string;
  /** Caption text drawn over this slide (optional) */
  caption?: string;
}

export interface RenderOptions {
  slides: Slide[];
  aspect: Aspect;
  /** Seconds per slide (before transition) */
  perSlide: number;
  /** Crossfade duration in seconds */
  transition: number;
  /** Optional background music URL (ObjectURL) */
  musicUrl?: string | null;
  /** Optional title shown on the first slide */
  title?: string;
  fps?: number;
  onProgress?: (pct: number) => void;
}

const DIMS: Record<Aspect, { w: number; h: number }> = {
  vertical: { w: 1080, h: 1920 },
  horizontal: { w: 1920, h: 1080 },
  square: { w: 1080, h: 1080 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pickMimeType(): { mime: string; ext: string } {
  const candidates = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: "video/webm", ext: "webm" };
}

/** Draw an image to fully cover the canvas, applying a Ken Burns transform. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const scale = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (W - dw) / 2 + panX * (dw - W) * 0.5;
  const dy = (H - dh) / 2 + panY * (dh - H) * 0.5;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, W: number, H: number, alpha: number) {
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const fontSize = Math.round(W * 0.045);
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  // Wrap
  const maxWidth = W * 0.88;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = fontSize * 1.2;
  const padY = fontSize * 0.6;
  const blockH = lines.length * lineH + padY * 2;
  const blockY = H - H * 0.08 - blockH;

  // Gradient backdrop
  const grad = ctx.createLinearGradient(0, blockY, 0, blockY + blockH);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, blockY - padY, W, blockH + padY);

  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  for (let i = 0; i < lines.length; i++) {
    const y = blockY + padY + (i + 1) * lineH - lineH * 0.2;
    ctx.fillText(lines[i], W / 2, y);
  }
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, text: string, W: number, H: number, alpha: number) {
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const fontSize = Math.round(W * 0.08);
  ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 20;
  ctx.fillText(text, W / 2, H / 2);
  ctx.restore();
}

export async function renderImagesToVideo(opts: RenderOptions): Promise<{ blob: Blob; ext: string }> {
  const fps = opts.fps ?? 30;
  const { w: W, h: H } = DIMS[opts.aspect];
  const perSlide = Math.max(1.2, opts.perSlide);
  const transition = Math.max(0.2, Math.min(opts.transition, perSlide - 0.2));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  // Pre-load all images
  const imgs = await Promise.all(opts.slides.map((s) => loadImage(s.src)));

  // Ken Burns plan per slide
  const plans = imgs.map((_, i) => {
    const zoomStart = 1.0 + (i % 2 === 0 ? 0.0 : 0.12);
    const zoomEnd = 1.0 + (i % 2 === 0 ? 0.18 : 0.0);
    const dir = i % 4;
    const pans: Array<[number, number, number, number]> = [
      [-0.4, 0, 0.4, 0],
      [0.4, 0, -0.4, 0],
      [0, -0.4, 0, 0.4],
      [0, 0.4, 0, -0.4],
    ];
    const [px0, py0, px1, py1] = pans[dir];
    return { zoomStart, zoomEnd, px0, py0, px1, py1 };
  });

  // Set up MediaRecorder
  const stream = canvas.captureStream(fps);

  // Music (optional)
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  if (opts.musicUrl) {
    try {
      audioEl = new Audio(opts.musicUrl);
      audioEl.loop = true;
      audioEl.crossOrigin = "anonymous";
      // @ts-expect-error vendor
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      await audioEl.play().catch(() => {});
    } catch (e) {
      console.warn("Audio attach failed:", e);
    }
  }

  const { mime, ext } = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalDur = imgs.length * perSlide - (imgs.length - 1) * transition * 0.5;
  const totalFrames = Math.round(totalDur * fps);

  recorder.start();

  const startTs = performance.now();
  let frame = 0;

  await new Promise<void>((resolve) => {
    function tick() {
      const t = frame / fps; // seconds
      const stride = perSlide - transition; // slide-to-slide stride
      const rawIdx = t / stride;
      const idx = Math.min(imgs.length - 1, Math.floor(rawIdx));
      const localT = (t - idx * stride) / perSlide; // 0..1 progress through this slide

      const p = plans[idx];
      const ease = localT; // linear pan/zoom feels cinematic enough
      const zoom = p.zoomStart + (p.zoomEnd - p.zoomStart) * ease;
      const px = p.px0 + (p.px1 - p.px0) * ease;
      const py = p.py0 + (p.py1 - p.py0) * ease;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawCover(ctx, imgs[idx], W, H, zoom, px, py);

      // Outgoing image during transition tail
      const tailStart = perSlide - transition;
      if (localT > tailStart / perSlide && idx < imgs.length - 1) {
        const nextLocal = (localT - tailStart / perSlide) / (transition / perSlide); // 0..1
        const np = plans[idx + 1];
        const nz = np.zoomStart + (np.zoomEnd - np.zoomStart) * 0;
        ctx.save();
        ctx.globalAlpha = nextLocal;
        drawCover(ctx, imgs[idx + 1], W, H, nz, np.px0, np.py0);
        ctx.restore();
      }

      // Caption
      const cap = opts.slides[idx].caption;
      if (cap) {
        const fadeIn = Math.min(1, localT / 0.15);
        const fadeOut = Math.min(1, (1 - localT) / 0.15);
        drawCaption(ctx, cap, W, H, Math.min(fadeIn, fadeOut));
      }

      // Title only on first slide
      if (idx === 0 && opts.title) {
        const fadeIn = Math.min(1, localT / 0.2);
        const fadeOut = Math.min(1, (0.6 - localT) / 0.2);
        const a = Math.max(0, Math.min(fadeIn, fadeOut));
        if (a > 0) drawTitle(ctx, opts.title, W, H, a);
      }

      frame++;
      opts.onProgress?.(Math.min(1, frame / totalFrames));

      if (frame >= totalFrames) {
        resolve();
        return;
      }
      // Pace to real time so MediaRecorder captures smoothly
      const targetMs = (frame / fps) * 1000;
      const elapsed = performance.now() - startTs;
      const delay = Math.max(0, targetMs - elapsed);
      setTimeout(() => requestAnimationFrame(tick), delay);
    }
    requestAnimationFrame(tick);
  });

  recorder.stop();
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  if (audioEl) {
    audioEl.pause();
  }
  if (audioCtx) {
    try { await audioCtx.close(); } catch { /* noop */ }
  }
  stream.getTracks().forEach((t) => t.stop());

  return { blob: new Blob(chunks, { type: mime }), ext };
}
