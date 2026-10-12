'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import Link from 'next/link';
import { Camera, CameraOff, CheckCircle2, ChevronRight, Keyboard, Loader2, LogOut, ShieldAlert, Users, XCircle } from 'lucide-react';
import type { CheckInResult } from '@/lib/hotel-medallion';
import { MedallionLogo } from '@/components/hotel-medallion/MedallionBrand';

type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported' | 'error';
type Outcome = { kind: 'checking' } | { kind: 'error'; message: string } | CheckInResult;
type Stats = { registered: number; checkedIn: number; recent: { name: string; code: string; checkedInAt: string }[] };

const SCAN_INTERVAL_MS = 120;
const DECODE_WIDTH = 640;
// After a result is dismissed, the same QR is ignored for a moment so a guest
// who is still holding their phone up isn't immediately re-scanned as "already in".
const SAME_CODE_COOLDOWN_MS = 6000;

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function DoorScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodeRef = useRef(0);
  const busyRef = useRef(false);
  const lastPayloadRef = useRef<{ payload: string; at: number } | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const [camera, setCamera] = useState<CameraState>('idle');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/hotel-medallion/stats', { cache: 'no-store' });
      if (res.status === 401) return window.location.reload();
      if (res.ok) setStats(await res.json());
    } catch {
      // Stats are informational; the next poll will retry.
    }
  }, []);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 20000);
    return () => clearInterval(id);
  }, [loadStats]);

  const feedback = useCallback((kind: 'admitted' | 'already' | 'invalid') => {
    navigator.vibrate?.(kind === 'admitted' ? 120 : [80, 60, 80, 60, 80]);
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = kind === 'admitted' ? 880 : kind === 'already' ? 520 : 220;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }, []);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
    if (lastPayloadRef.current) lastPayloadRef.current.at = Date.now();
    setOutcome(null);
    busyRef.current = false;
  }, []);

  const process = useCallback(
    async (payload: string) => {
      busyRef.current = true;
      lastPayloadRef.current = { payload, at: Date.now() };
      setOutcome({ kind: 'checking' });

      let next: Outcome;
      try {
        const res = await fetch('/api/hotel-medallion/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        if (res.status === 401) {
          window.location.reload();
          return;
        }
        const data = await res.json();
        next = res.ok ? (data as CheckInResult) : { kind: 'error', message: data.error || 'Check-in failed' };
      } catch {
        next = { kind: 'error', message: 'No connection — check the network and try again.' };
      }

      setOutcome(next);
      if ('result' in next) {
        feedback(next.result);
        if (next.result === 'admitted') loadStats();
      }
      const admitted = 'result' in next && next.result === 'admitted';
      dismissTimerRef.current = setTimeout(dismiss, admitted ? 2500 : 5000);
    },
    [dismiss, feedback, loadStats]
  );

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const video = videoRef.current;
    const now = performance.now();
    if (busyRef.current || !video || video.readyState < 2 || now - lastDecodeRef.current < SCAN_INTERVAL_MS) return;
    lastDecodeRef.current = now;

    const scale = Math.min(1, DECODE_WIDTH / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    if (!w || !h) return;
    const canvas = (canvasRef.current ??= document.createElement('canvas'));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
    if (!hit?.data) return;

    const last = lastPayloadRef.current;
    if (last && last.payload === hit.data && Date.now() - last.at < SAME_CODE_COOLDOWN_MS) return;
    process(hit.data);
  }, [process]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  async function startCamera() {
    // Created inside the tap so iOS allows audio feedback later.
    try {
      audioRef.current ??= new AudioContext();
      await audioRef.current.resume();
    } catch {
      // Sound is a nicety; vibration and colour still signal results.
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    setCamera('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCamera('live');
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stopCamera();
      const name = err instanceof DOMException ? err.name : '';
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
  }

  useEffect(() => () => {
    stopCamera();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    audioRef.current?.close().catch(() => {});
  }, [stopCamera]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || busyRef.current) return;
    setManualCode('');
    process(code);
  }

  async function signOut() {
    stopCamera();
    await fetch('/api/hotel-medallion/scanner/session', { method: 'DELETE' });
    window.location.reload();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MedallionLogo size={40} />
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-(--hm-accent)">Hotel Medallion</p>
            <h1 className="font-serif text-xl leading-tight text-(--hm-cream)">Door check-in</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-full border border-(--hm-line) px-3 py-2 text-xs text-(--hm-mist) transition hover:border-(--hm-accent)/50 hover:text-(--hm-cream)"
        >
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </button>
      </header>

      <section aria-label="Attendance" className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Checked in" value={stats?.checkedIn} accent />
        <Stat label="Registered" value={stats?.registered} />
      </section>

      <Link
        href="/hotel-medallion/scan/guests"
        className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-4 py-3.5 text-sm text-(--hm-cream) transition hover:border-(--hm-accent)/60"
      >
        <span className="flex items-center gap-2.5">
          <Users className="size-4 text-(--hm-accent)" aria-hidden />
          View guest list
        </span>
        <ChevronRight className="size-4 text-(--hm-dim)" aria-hidden />
      </Link>

      <section className="relative mt-5 aspect-square w-full overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-ink)">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${camera === 'live' ? '' : 'invisible'}`}
        />

        {camera === 'live' && !outcome && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative size-3/5">
              {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl',
              ].map((pos) => <span key={pos} className={`absolute size-10 border-(--hm-accent) ${pos}`} />)}
            </div>
            <p className="absolute bottom-4 text-xs uppercase tracking-[0.24em] text-(--hm-cream)/80">Point at guest’s QR code</p>
          </div>
        )}

        {camera !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {camera === 'starting' ? (
              <Loader2 className="size-8 animate-spin text-(--hm-accent)" aria-label="Starting camera" />
            ) : camera === 'idle' ? (
              <>
                <Camera className="size-10 text-(--hm-accent)" aria-hidden />
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-full bg-(--hm-accent) px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-(--hm-navy) transition hover:bg-(--hm-accent-soft) active:scale-95"
                >
                  Start scanning
                </button>
              </>
            ) : (
              <>
                <CameraOff className="size-10 text-(--hm-bad)" aria-hidden />
                <p className="max-w-xs text-sm leading-relaxed text-(--hm-mist)">
                  {camera === 'denied'
                    ? 'Camera access was blocked. Allow camera access for this site in your browser settings, then try again.'
                    : camera === 'unsupported'
                      ? 'This browser can’t open the camera here (a secure https:// connection is required). Use manual entry below.'
                      : 'The camera couldn’t be started. Close other apps using it and try again.'}
                </p>
                {camera !== 'unsupported' && (
                  <button type="button" onClick={startCamera} className="text-sm text-(--hm-accent) underline underline-offset-4">
                    Try again
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {outcome && <OutcomeCard outcome={outcome} onDismiss={dismiss} />}
      </section>

      <div className="mt-4">
        {manualOpen ? (
          <form onSubmit={submitManual} className="flex gap-2">
            <label htmlFor="manual-code" className="sr-only">Ticket code</label>
            <input
              id="manual-code"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="HM-XXXX-XXXX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="min-w-0 flex-1 rounded-full border border-(--hm-line) bg-(--hm-ink)/70 px-5 py-3 font-mono text-base uppercase tracking-[0.18em] text-(--hm-cream) placeholder:text-(--hm-dim)/60 focus:border-(--hm-accent)/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || outcome !== null}
              className="rounded-full bg-(--hm-accent) px-5 py-3 text-sm font-semibold text-(--hm-navy) disabled:opacity-50"
            >
              Check in
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="mx-auto flex items-center gap-2 text-sm text-(--hm-mist) hover:text-(--hm-cream)"
          >
            <Keyboard className="size-4" aria-hidden />
            Enter code manually
          </button>
        )}
      </div>

      {stats && stats.recent.length > 0 && (
        <section className="mt-6" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-xs uppercase tracking-[0.26em] text-(--hm-dim)">Recent arrivals</h2>
          <ul className="mt-3 divide-y divide-(--hm-line) rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60">
            {stats.recent.map((g) => (
              <li key={g.code} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate text-(--hm-cream)">{g.name}</span>
                <span className="shrink-0 tabular-nums text-(--hm-dim)">{timeFmt.format(new Date(g.checkedInAt))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value?: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-4 py-3">
      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-(--hm-dim)">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${accent ? 'text-(--hm-accent-soft)' : 'text-(--hm-cream)'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function OutcomeCard({ outcome, onDismiss }: { outcome: Outcome; onDismiss: () => void }) {
  if ('kind' in outcome && outcome.kind === 'checking') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-(--hm-ink)/80 backdrop-blur-sm" role="status">
        <Loader2 className="size-10 animate-spin text-(--hm-accent)" aria-label="Verifying" />
      </div>
    );
  }

  const view =
    'kind' in outcome
      ? { tone: 'bg-red-950/95 border-red-400/60', Icon: XCircle, iconClass: 'text-(--hm-bad)', title: 'Couldn’t verify', detail: outcome.message, name: undefined }
      : outcome.result === 'admitted'
        ? { tone: 'bg-emerald-950/95 border-emerald-400/60', Icon: CheckCircle2, iconClass: 'text-(--hm-ok)', title: 'Welcome — admit guest', name: outcome.guest.name, detail: outcome.guest.code }
        : outcome.result === 'already'
          ? { tone: 'bg-amber-950/95 border-amber-400/60', Icon: ShieldAlert, iconClass: 'text-(--hm-warn)', title: 'Already checked in', name: outcome.guest.name, detail: `First entry at ${timeFmt.format(new Date(outcome.guest.checkedInAt))} · ${outcome.guest.code}` }
          : { tone: 'bg-red-950/95 border-red-400/60', Icon: XCircle, iconClass: 'text-(--hm-bad)', title: 'Not on the guest list', name: undefined, detail: 'This code isn’t registered for the Hotel Medallion relaunch.' };

  return (
    <button
      type="button"
      onClick={onDismiss}
      role="alert"
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 border-4 p-6 text-center ${view.tone}`}
    >
      <view.Icon className={`size-16 ${view.iconClass}`} aria-hidden />
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{view.title}</p>
      {view.name && <p className="font-serif text-3xl leading-tight text-white">{view.name}</p>}
      <p className="max-w-xs text-sm text-white/80">{view.detail}</p>
      <p className="mt-2 text-xs text-white/60">Tap to continue</p>
    </button>
  );
}
