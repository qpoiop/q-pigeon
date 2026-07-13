/** Peer-to-peer voice chat (WebRTC) with signalling carried over the relay. */
export type SignalKind = 'offer' | 'answer' | 'ice';

/** The transport Voice uses to exchange SDP/ICE with a specific peer. */
export interface Signaler {
  id: string;
  signal(to: string, kind: SignalKind, data: unknown): void;
}

export class Voice {
  net: Signaler;
  enabled = false;
  muted = false;
  stream: MediaStream | null = null;
  pcs: Record<string, RTCPeerConnection> = {};
  audios: Record<string, HTMLAudioElement> = {};

  constructor(net: Signaler) {
    this.net = net;
  }

  async enable(): Promise<boolean> {
    if (this.stream) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.enabled = true;
      this.setMuted(false);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.stream) this.stream.getAudioTracks().forEach((t) => (t.enabled = !m));
  }

  /** Deterministic initiator selection so both peers don't both offer. */
  maybeConnect(peerId: string): void {
    if (!this.enabled || this.pcs[peerId]) return;
    if (this.net.id < peerId) this._create(peerId, true);
  }

  private _create(peerId: string, initiator: boolean): RTCPeerConnection | null {
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    } catch {
      return null;
    }
    this.pcs[peerId] = pc;
    if (this.stream) this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream!));
    pc.onicecandidate = (e) => {
      if (e.candidate) this.net.signal(peerId, 'ice', e.candidate);
    };
    pc.ontrack = (e) => {
      let a = this.audios[peerId];
      if (!a) {
        a = document.createElement('audio');
        a.autoplay = true;
        this.audios[peerId] = a;
        document.body.appendChild(a);
      }
      a.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.drop(peerId);
    };
    if (initiator) {
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => this.net.signal(peerId, 'offer', pc.localDescription))
        .catch(() => {});
    }
    return pc;
  }

  async handleSignal(from: string, kind: SignalKind, data: unknown): Promise<void> {
    if (!this.enabled) return;
    const pc = this.pcs[from] || this._create(from, false);
    if (!pc) return;
    try {
      if (kind === 'offer') {
        await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
        const a = await pc.createAnswer();
        await pc.setLocalDescription(a);
        this.net.signal(from, 'answer', pc.localDescription);
      } else if (kind === 'answer') {
        await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      } else if (kind === 'ice') {
        await pc.addIceCandidate(data as RTCIceCandidateInit);
      }
    } catch {
      /* transient signalling failure — the public relay is best-effort */
    }
  }

  drop(id: string): void {
    const pc = this.pcs[id];
    if (pc) {
      try {
        pc.close();
      } catch {
        /* already closed */
      }
    }
    delete this.pcs[id];
    const a = this.audios[id];
    if (a) {
      a.srcObject = null;
      if (a.parentNode) a.parentNode.removeChild(a);
    }
    delete this.audios[id];
  }
}
