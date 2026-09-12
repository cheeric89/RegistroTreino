import { useCallback, useRef, useState } from "react";

// Lock synchronously: disabled buttons alone do not cover two taps before React
// commits, or the gap between saving a meal and updating its recent foods.
export function useAsyncAction() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(async (action) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      return await action();
    } finally {
      locked.current = false;
      setPending(false);
    }
  }, []);
  return { pending, run };
}
