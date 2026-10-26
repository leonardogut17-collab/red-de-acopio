import { useCallback, useEffect, useState } from "react";

/** Carga datos de la API y expone loading/error/reload */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);

  const reload = useCallback(() => {
    setLoading(true);
    return load()
      .then((d) => { setData(d); setError(""); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => { void reload(); }, [reload]);

  return { data, setData, error, loading, reload };
}
