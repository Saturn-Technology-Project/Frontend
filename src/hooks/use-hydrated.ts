"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** False while server rendering and during hydration, true afterwards: for values that only the browser knows. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
