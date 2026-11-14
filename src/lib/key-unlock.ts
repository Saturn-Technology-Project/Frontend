// The on-demand "enter your password" prompt for the member key. Whatever needs the key calls
// requestKeyUnlock(); the dialog in the app shell answers. Nothing here is persisted.

type Waiter = (unlocked: boolean) => void;

let waiters: Waiter[] = [];
let attached = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeKeyUnlock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function keyUnlockRequested() {
  return waiters.length > 0;
}

/**
 * Opens the prompt and resolves true once the key is unlocked, false when the user declines.
 * Every caller waiting on it gets the same answer. With no dialog on the page (outside the
 * console, or in tests) nothing can ask, so it resolves false at once.
 */
export function requestKeyUnlock(): Promise<boolean> {
  if (!attached) return Promise.resolve(false);
  return new Promise((resolve) => {
    waiters.push(resolve);
    emit();
  });
}

export function settleKeyUnlock(unlocked: boolean) {
  const waiting = waiters;
  waiters = [];
  for (const resolve of waiting) resolve(unlocked);
  emit();
}

/** The dialog calls this while it is mounted. Detaching answers anything still waiting. */
export function attachKeyUnlockDialog() {
  attached = true;
  return () => {
    attached = false;
    settleKeyUnlock(false);
  };
}
