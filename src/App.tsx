import { PigeonGame } from './react/PigeonGame';
import type { GameOptions } from './game/types';

// Starting defaults for the two tweakables. Players change them live on the
// title screen; these match the original design's defaults (cones on, 16m).
const DEFAULT_OPTIONS: GameOptions = {
  showCones: true,
  camDist: 16,
};

export default function App() {
  return <PigeonGame options={DEFAULT_OPTIONS} />;
}
