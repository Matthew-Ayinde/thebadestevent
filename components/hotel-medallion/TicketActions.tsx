'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, QrCode } from 'lucide-react';
import { MEDALLION_EVENT, medallionQrPayload } from '@/lib/hotel-medallion';

const NAVY = '#0a1a3f';
const DEEP = '#040b1f';
const ACCENT = '#00aef1';
const CREAM = '#f3efe4';
const MIST = '#b3c0e0';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Helvetica, Arial, sans-serif';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
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

async function renderQr(token: string, width: number, margin: number) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, medallionQrPayload(token), {
    errorCorrectionLevel: 'M',
    margin,
    width,
    color: { dark: NAVY, light: '#ffffff' },
  });
  return canvas;
}

/** A self-contained, phone-wallpaper-sized pass that still scans at the door. */
async function renderPass(token: string, code: string, name: string) {
  const e = MEDALLION_EVENT;
  const W = 1080;
  const H = 1720;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#13306b');
  bg.addColorStop(0.45, NAVY);
  bg.addColorStop(1, DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0,174,241,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  let y = 110;
  try {
    const logo = await loadImage(e.logoPath);
    ctx.drawImage(logo, W / 2 - 80, y, 160, 160);
  } catch {
    // Logo is decorative on the pass; carry on without it.
  }
  y += 220;

  ctx.fillStyle = ACCENT;
  ctx.font = `600 26px ${SANS}`;
  ctx.letterSpacing = '14px';
  ctx.fillText('HOTEL', W / 2 + 7, y);
  y += 72;
  ctx.fillStyle = CREAM;
  ctx.font = `64px ${SERIF}`;
  ctx.letterSpacing = '12px';
  ctx.fillText('MEDALLION', W / 2 + 6, y);
  ctx.letterSpacing = '0px';

  y += 80;
  ctx.fillStyle = MIST;
  ctx.font = `italic 36px ${SERIF}`;
  for (const line of wrapLines(ctx, e.invitationLine, W - 240)) {
    ctx.fillText(line, W / 2, y);
    y += 48;
  }

  y += 20;
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 34px ${SANS}`;
  ctx.fillText(e.timeLabel ? `${e.dateLabel} · ${e.timeLabel}` : e.dateLabel, W / 2, y);
  y += 50;
  ctx.fillStyle = MIST;
  ctx.font = `28px ${SANS}`;
  for (const line of wrapLines(ctx, e.venueAddress, W - 240)) {
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
  ctx.drawImage(await renderQr(token, qrSize, 0), W / 2 - qrSize / 2, y + pad);
  y += qrSize + pad * 2 + 70;

  ctx.fillStyle = CREAM;
  ctx.font = `48px ${SERIF}`;
  ctx.fillText(name, W / 2, y);
  y += 50;
  ctx.fillStyle = MIST;
  ctx.font = `30px "Courier New", monospace`;
  ctx.letterSpacing = '8px';
  ctx.fillText(code, W / 2 + 4, y);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(179,192,224,0.8)';
  ctx.font = `24px ${SANS}`;
  ctx.fillText(`For PR inquiries, contact ${e.prContactName} ${e.prContactEmail}`, W / 2, H - 80);

  return canvas;
}

export function TicketActions({ token, code, name }: { token: string; code: string; name: string }) {
  const [busy, setBusy] = useState<'pass' | 'qr' | null>(null);
  const [error, setError] = useState('');

  async function download(kind: 'pass' | 'qr') {
    setBusy(kind);
    setError('');
    try {
      const canvas = kind === 'pass' ? await renderPass(token, code, name) : await renderQr(token, 1024, 4);
      triggerDownload(canvas, `hotel-medallion-${kind === 'pass' ? 'pass' : 'qr'}-${code}.png`);
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
          className="flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-5 py-3.5 text-sm font-semibold text-(--hm-navy) transition hover:bg-(--hm-accent-soft) active:scale-[0.98] disabled:opacity-60"
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
