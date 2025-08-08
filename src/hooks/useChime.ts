import { useEffect, useRef, useState } from 'react';

export interface ChimeSettingsLite {
  enabled: boolean;
  volume: number; // 0..1
  onlyWhenVisible: boolean;
  rateLimitMs: number;
  quietHours: { enabled: boolean; start: string; end: string };
  eventTypeChimes: Record<string, { enabled: boolean; soundId: string; volume?: number }>;
}

function isWithinQuietHours(now: Date, start: string, end: string): boolean {
  // start/end as HH:mm in local time
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const curMin = now.getHours() * 60 + now.getMinutes();
  if (startMin === endMin) return false; // disabled-like
  if (startMin < endMin) {
    return curMin >= startMin && curMin < endMin;
  }
  // wraps midnight
  return curMin >= startMin || curMin < endMin;
}

export function useChime() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef<number>(0);
  const [initialized, setInitialized] = useState(false);

  const ensureContext = async () => {
    if (typeof window === 'undefined') return false;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return false;
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch {}
    }
    setInitialized(true);
    return true;
  };

  const getSettings = (): ChimeSettingsLite | null => {
    try {
      const raw = localStorage.getItem('chime_settings');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const playBeep = (gainLevel: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880; // pleasant short chime
    gain.gain.value = Math.max(0, Math.min(1, gainLevel));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const playForEvent = async (event: any, eventType: string) => {
    const settings = getSettings();
    if (!settings || !settings.enabled) return;

    // Visibility
    if (settings.onlyWhenVisible && typeof document !== 'undefined' && document.hidden) return;

    // Quiet hours
    if (settings.quietHours?.enabled) {
      if (isWithinQuietHours(new Date(), settings.quietHours.start, settings.quietHours.end)) return;
    }

    // Rate limit
    const now = Date.now();
    if (now - lastPlayRef.current < (settings.rateLimitMs || 3000)) return;

    const config = settings.eventTypeChimes?.[eventType] || { enabled: false, soundId: 'beep' };
    if (!config.enabled) return;

    const ok = await ensureContext();
    if (!ok) return;

    const vol = typeof config.volume === 'number' ? config.volume : settings.volume ?? 0.6;
    playBeep(vol);
    lastPlayRef.current = now;
  };

  const playTest = async () => {
    const ok = await ensureContext();
    if (!ok) return;
    playBeep(0.6);
  };

  return { playForEvent, playTest, initializeAudio: ensureContext, initialized };
}
