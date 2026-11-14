// Protocolo entre los celulares (jugadores) y el navegador del profesor (anfitrión),
// transportado por canales de datos WebRTC (PeerJS). Solo la señalización inicial pasa
// por un servidor público; el juego viaja directo entre dispositivos y cifrado (DTLS).

import type { PeerJSOption } from 'peerjs';
import type { Signaling } from '../engine/settings';
import type { AvatarConfig, PlayerAction, PlayerView } from '../../shared/types';

export const PEER_PREFIX = 'ixchel-mars-v1-';

export type ToHost =
  | { t: 'join'; name: string; avatar: AvatarConfig; xp: number; token?: string }
  | { t: 'act'; rid: number; action: PlayerAction }
  | { t: 'hb' };

export type ToPlayer =
  | { t: 'joined'; playerId: string; token: string; name: string }
  | { t: 'error'; error: string }
  | { t: 'ack'; rid: number; ok: boolean; error?: string }
  | { t: 'view'; view: PlayerView }
  | { t: 'kicked' };

export function peerOptions(sig: Signaling | null | undefined): PeerJSOption {
  const base: PeerJSOption = { debug: 0 };
  if (sig?.host) return { ...base, host: sig.host, port: sig.port || 443, path: sig.path || '/', secure: sig.secure };
  return base;
}

/** Codifica un servidor de señalización propio dentro del enlace del QR. */
export function encodeSignaling(sig: Signaling | null): string {
  if (!sig?.host) return '';
  return btoa(JSON.stringify(sig)).replace(/=+$/, '');
}

export function decodeSignaling(raw: string | null): Signaling | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(atob(raw)) as Signaling;
    return s && typeof s.host === 'string' ? s : null;
  } catch {
    return null;
  }
}
