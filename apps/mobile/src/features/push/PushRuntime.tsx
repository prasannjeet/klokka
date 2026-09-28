import { usePushRuntime } from './usePush';

// Mounted once inside the signed-in tree (src/features/shell/AuthGate.tsx).
export function PushRuntime() {
  usePushRuntime();
  return null;
}
