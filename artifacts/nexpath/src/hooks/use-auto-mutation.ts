import { useCallback, useEffect, useRef } from 'react';

/**
 * Fires a POST-style mutation whenever the serialised payload changes
 * (e.g. the profile is edited), so derived data is always recalculated.
 */
export function useAutoMutation<V>(mutate: (vars: { data: V }) => void, payload: V | null) {
  const key = payload ? JSON.stringify(payload) : null;
  const ref = useRef(mutate);
  ref.current = mutate;
  useEffect(() => {
    if (key) ref.current({ data: JSON.parse(key) as V });
  }, [key]);
  return useCallback(() => {
    if (key) ref.current({ data: JSON.parse(key) as V });
  }, [key]);
}
