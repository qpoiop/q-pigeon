import * as THREE from 'three';
import type { CharId } from '../data/characters';
import type { ItemType } from '../data/levels';

/** A rigged bird model plus the state its procedural animation needs. */
export interface Bird {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  wings: [THREE.Mesh, THREE.Mesh];
  feet: [THREE.Group, THREE.Group];
  tail: THREE.Mesh;
  phase: number;
  idleT: number;
  baseHeadY: number;
  baseHeadZ: number;
}

/** The player's bird carries movement state and the smoke shell. */
export interface Player extends Bird {
  pos: THREE.Vector2;
  facing: number;
  crouch: boolean;
  smokeUntil: number;
  smokeShell?: THREE.Mesh;
}

export type GuardState = 'patrol' | 'chase' | 'lured';

export interface Guard {
  model: Bird;
  cone: THREE.Mesh;
  bang: THREE.Sprite;
  path: [number, number][];
  seg: number;
  speed: number;
  range: number;
  fov: number;
  pos: THREE.Vector2;
  facing: number;
  detect: number;
  state: GuardState;
  loseT: number;
  lureT: number;
  lure: Decoy | null;
}

export interface Film {
  x: number;
  z: number;
  mesh: THREE.Group;
  core: THREE.Mesh;
  got: boolean;
}

export interface Item {
  t: ItemType;
  x: number;
  z: number;
  mesh: THREE.Group;
  core: THREE.Mesh;
  got: boolean;
}

export interface Decoy {
  x: number;
  z: number;
  mesh: THREE.Group;
  t: number;
}

/** Axis-aligned bounds used for collision / cover / line-of-sight tests. */
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Remote player state received over the relay. */
export interface Peer {
  x: number;
  z: number;
  ry: number;
  stage: number;
  name: string;
  crouch: number;
  char: CharId;
  mic: number;
  seen: number;
}

export interface PeerMesh {
  pg: Bird;
  x: number;
  z: number;
  ry: number;
  char: CharId;
}

export interface GameOptions {
  showCones: boolean;
  camDist: number;
}
