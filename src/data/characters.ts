import { ACCENT } from './palette';

/** The three playable agent classes. Add a new entry here to ship a new model. */
export type CharId = string;

/** Colours used when building a bird mesh for this character. */
export interface BirdPalette {
  body: number;
  head: number;
  wing: number;
  accent: number;
}

/** The visual "kind" the bird builder branches on for silhouette details. */
export type BirdKind = 'pigeon' | 'magpie' | 'owl' | 'guard';

export interface CharDef {
  /** Display name (Korean). */
  name: string;
  /** Short role label. */
  role: string;
  /** One-line description shown on the character card. */
  desc: string;
  /** Movement-speed multiplier. */
  speed: number;
  /** How easily guards detect this agent (>1 = more visible). */
  detect: number;
  /** Dash cooldown in seconds. */
  dashCd: number;
  /** Mesh silhouette variant. */
  kind: BirdKind;
  /** Mesh colours. */
  pal: BirdPalette;
}

export const CHARS: Record<CharId, CharDef> = {
  pigeon: {
    name: '비둘기',
    role: '균형형',
    desc: '속도와 은신의 균형. 표준 특무요원.',
    speed: 1,
    detect: 1,
    dashCd: 1.4,
    kind: 'pigeon',
    pal: { body: 0xe8e6e4, head: 0x35322f, wing: 0x201e1d, accent: ACCENT },
  },
  magpie: {
    name: '까치',
    role: '속도형',
    desc: '빠르고 대시 재사용이 짧다. 대신 눈에 잘 띈다.',
    speed: 1.22,
    detect: 1.18,
    dashCd: 0.9,
    kind: 'magpie',
    pal: { body: 0x201e1d, head: 0x201e1d, wing: 0xf3f2f2, accent: ACCENT },
  },
  owl: {
    name: '부엉이',
    role: '은신형',
    desc: '느리지만 조용하다. 경비의 시야가 좁아진다.',
    speed: 0.85,
    detect: 0.68,
    dashCd: 1.8,
    kind: 'owl',
    pal: { body: 0xbdb4a9, head: 0xa39a8e, wing: 0x6d675f, accent: ACCENT },
  },
};

/** Stable iteration order for menus (also lets new keys append predictably). */
export const CHAR_ORDER: CharId[] = Object.keys(CHARS);
