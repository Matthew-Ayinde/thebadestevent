'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, QrCode } from 'lucide-react';
import { formatEventWhen, qrInk, qrPayload, themeTokens, type EventSiteView } from '@/lib/event-site';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Helvetica, Arial, sans-serif';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Logos on a CDN must load with CORS or the canvas becomes unexportable.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function triggerDownload(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

async function renderQr(token: string, width: number, margin: number, dark: string) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, qrPayload(token), {
    errorCorrectionLevel: 'M',
    margin,
    width,
    color: { dark, light: '#ffffff' },
  });
  return canvas;
}

/** A self-contained, phone-wallpaper-sized pass that still scans at the door. */
async function renderPass(e: EventSiteView, token: string, code: string, name: string) {
  const k = themeTokens(e.theme);
  const W = 1080;
  const MIN_H = 1720;
  // Copy length varies per event, so lay the content out on a tall scratch canvas first and size
  // the pass to fit — a fixed height would push the QR code off the bottom for long invitations.
  const content = document.createElement('canvas');
  content.width = W;
  content.height = 4000;
  const ctx = content.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  let y = 110;
  if (e.logoUrl) {
    try {
      const logo = await loadImage(e.logoUrl);
      const scale = Math.min(160 / logo.width, 160 / logo.height);
      ctx.drawImage(logo, W / 2 - (logo.width * scale) / 2, y, logo.width * scale, logo.height * scale);
    } catch {
      // Logo is decorative on the pass; carry on without it.
    }
    y += 220;
  } else {
    y += 40;
  }

  if (e.brandEyebrow) {
    ctx.fillStyle = k.accent;
    ctx.font = `600 26px ${SANS}`;
    ctx.letterSpacing = '14px';
    ctx.fillText(e.brandEyebrow.toUpperCase(), W / 2 + 7, y);
    y += 72;
  }
  ctx.fillStyle = k.cream;
  ctx.font = `64px ${SERIF}`;
  ctx.letterSpacing = '12px';
  for (const line of wrapLines(ctx, e.brandWordmark.toUpperCase(), W - 200)) {
    ctx.fillText(line, W / 2 + 6, y);
    y += 76;
  }
  y -= 76;
  ctx.letterSpacing = '0px';

  y += 80;
  ctx.fillStyle = k.mist;
  ctx.font = `italic 36px ${SERIF}`;
  for (const line of wrapLines(ctx, e.invitationLine || e.title, W - 240)) {
    ctx.fillText(line, W / 2, y);
    y += 48;
  }

  y += 20;
  ctx.fillStyle = k.accent;
  ctx.font = `bold 32px ${SANS}`;
  for (const line of wrapLines(ctx, formatEventWhen(e), W - 200)) {
    ctx.fillText(line, W / 2, y);
    y += 44;
  }
  y += 6;
  ctx.fillStyle = k.mist;
  ctx.font = `28px ${SANS}`;
  for (const line of [e.venueName, ...e.venueAddressLines].filter(Boolean).flatMap((l) => wrapLines(ctx, l, W - 240))) {
    ctx.fillText(line, W / 2, y);
    y += 38;
  }

  y += 30;
  const qrSize = 560;
  const pad = 44; // ≈2 modules of quiet zone so door scanners lock on quickly
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(W / 2 - qrSize / 2 - pad, y, qrSize + pad * 2, qrSize + pad * 2, 32);
  ctx.fill();
  ctx.drawImage(await renderQr(token, qrSize, 0, qrInk(e)), W / 2 - qrSize / 2, y + pad);
  y += qrSize + pad * 2 + 70;

  ctx.fillStyle = k.cream;
  ctx.font = `48px ${SERIF}`;
  ctx.fillText(name, W / 2, y);
  y += 50;
  ctx.fillStyle = k.mist;
  ctx.font = `30px "Courier New", monospace`;
  ctx.letterSpacing = '8px';
  ctx.fillText(code, W / 2 + 4, y);
  ctx.letterSpacing = '0px';

  const H = Math.max(MIN_H, y + 122);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const out = canvas.getContext('2d')!;
  out.textAlign = 'center';
  out.textBaseline = 'alphabetic';

  const bg = out.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, k.royal);
  bg.addColorStop(0.45, k.navy);
  bg.addColorStop(1, k.ink);
  out.fillStyle = bg;
  out.fillRect(0, 0, W, H);

  out.strokeStyle = k.accent;
  out.globalAlpha = 0.45;
  out.lineWidth = 2;
  out.strokeRect(40, 40, W - 80, H - 80);
  out.globalAlpha = 1;

  out.drawImage(content, 0, 0, W, H, 0, 0, W, H);

  if (e.contactEmail) {
    out.fillStyle = k.dim;
    out.font = `24px ${SANS}`;
    out.fillText(`For enquiries, contact ${e.contactName} ${e.contactEmail}`.replace(/\s+/g, ' '), W / 2, H - 80);
  }

  return canvas;
}

export function TicketActions({ event, token, code, name }: { event: EventSiteView; token: string; code: string; name: string }) {
  const [busy, setBusy] = useState<'pass' | 'qr' | null>(null);
  const [error, setError] = useState('');

  async function download(kind: 'pass' | 'qr') {
    setBusy(kind);
    setError('');
    try {
      const canvas = kind === 'pass' ? await renderPass(event, token, code, name) : await renderQr(token, 1024, 4, qrInk(event));
      triggerDownload(canvas, `${event.slug}-${kind === 'pass' ? 'pass' : 'qr'}-${code}.png`);
    } catch (err) {
      console.error(err);
      setError('Download failed — you can screenshot this page instead.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => download('pass')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-5 py-3.5 text-sm font-semibold text-(--hm-on-accent) transition hover:bg-(--hm-accent-soft) active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'pass' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          Download pass
        </button>
        <button
          type="button"
          onClick={() => download('qr')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-full border border-(--hm-accent)/50 px-5 py-3.5 text-sm font-semibold text-(--hm-accent-soft) transition hover:bg-(--hm-accent)/10 active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'qr' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <QrCode className="size-4" aria-hidden />}
          QR code only
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-center text-xs text-(--hm-bad)">{error}</p>}
    </div>
  );
}
