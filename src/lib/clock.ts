// Reloj sincronizado con el anfitrión: los cronómetros se calculan con la hora del
// navegador del profesor, aunque los celulares tengan la hora desfasada.

import { useEffect, useState } from 'react';

let offset = 0;

export function syncClock(hostNow: number) {
  offset = hostNow - Date.now();
}

export function hostNow() {
  return Date.now() + offset;
}

export function useTicker(ms = 250) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return hostNow();
}

export function remaining(deadline: number | null, paused: boolean, pausedRemaining: number | null): number | null {
  if (paused) return pausedRemaining;
  if (!deadline) return null;
  return Math.max(0, deadline - hostNow());
}

export function fmtTime(ms: number | null): string {
  if (ms === null) return '--:--';
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
