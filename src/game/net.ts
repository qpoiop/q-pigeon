import { Voice, type Signaler, type SignalKind } from './voice';
import type { Peer, Player } from './types';
import type { CharId } from '../data/characters';

export type NetState = 'off' | 'connecting' | 'on';

/** Free public relay used as a best-effort broadcast bus for a room code. */
const RELAY_URL = 'wss://socketsbay.com/wss/v2/1/demo/';
const PROTOCOL_TAG = 'pigeon-protocol';

/**
 * Thin presence/signalling layer over a public WebSocket relay. Every client in
 * a room broadcasts its position; unknown/foreign messages are ignored. The
 * relay is unreliable by design — the game falls back to single-player if it
 * never connects.
 */
export class Net implements Signaler {
  ws: WebSocket | null = null;
  status: NetState = 'off';
  id: string = Math.random().toString(36).slice(2, 8);
  room = '';
  name = 'AGENT';
  peers: Record<string, Peer> = {};
  lastSend = 0;
  voice: Voice;
  private onStatus: () => void;

  constructor(onStatus: () => void) {
    this.onStatus = onStatus;
    this.voice = new Voice(this);
  }

  connect(room: string, name: string): void {
    this.room = room;
    this.name = (name || 'AGENT').slice(0, 10);
    if (!room) {
      this.status = 'off';
      return;
    }
    try {
      this.status = 'connecting';
      this.onStatus();
      const ws = new WebSocket(RELAY_URL);
      this.ws = ws;
      ws.onopen = () => {
        this.status = 'on';
        this.onStatus();
      };
      ws.onclose = () => {
        this.status = 'off';
        this.onStatus();
      };
      ws.onerror = () => {
        this.status = 'off';
        this.onStatus();
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };
      ws.onmessage = (ev) => {
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (!m || m.g !== PROTOCOL_TAG || m.room !== this.room || m.id === this.id) return;
        if (m.t === 'rtc') {
          if (m.to === this.id)
            void this.voice.handleSignal(m.id as string, m.kind as SignalKind, m.data);
          return;
        }
        const id = m.id as string;
        const p = this.peers[id] || (this.peers[id] = {} as Peer);
        p.x = m.x as number;
        p.z = m.z as number;
        p.ry = m.ry as number;
        p.stage = m.st as number;
        p.name = m.n as string;
        p.crouch = m.c as number;
        p.char = (m.ch as CharId) || 'pigeon';
        p.mic = m.v as number;
        p.seen = performance.now();
        this.voice.maybeConnect(id);
      };
    } catch {
      this.status = 'off';
    }
  }

  signal(to: string, kind: SignalKind, data: unknown): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(
        JSON.stringify({ g: PROTOCOL_TAG, room: this.room, id: this.id, t: 'rtc', to, kind, data }),
      );
    } catch {
      /* relay dropped */
    }
  }

  send(player: Player, stage: number, charId: CharId): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    const now = performance.now();
    if (now - this.lastSend < 140) return;
    this.lastSend = now;
    try {
      this.ws.send(
        JSON.stringify({
          g: PROTOCOL_TAG,
          room: this.room,
          id: this.id,
          n: this.name,
          x: +player.pos.x.toFixed(2),
          z: +player.pos.y.toFixed(2),
          ry: +player.facing.toFixed(2),
          c: player.crouch ? 1 : 0,
          st: stage,
          ch: charId,
          v: this.voice.enabled && !this.voice.muted ? 1 : 0,
        }),
      );
    } catch {
      /* relay dropped */
    }
  }
}
