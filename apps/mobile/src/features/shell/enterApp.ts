import { router } from 'expo-router';

// Entering the app (a workspace chosen, created, joined or switched, or a recovery after a crash)
// starts a fresh history: the start route decides the tab and nothing sits beneath the tabs for a
// back gesture or a back arrow to land on (CHQ-145: a stale screen under Home).
export function enterApp(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}
