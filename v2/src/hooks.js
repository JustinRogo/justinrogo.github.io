import { useEffect, useState } from "react";
export function useStored(key, initial, validate = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored != null && validate(stored) ? stored : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}
export function useMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
const cache = new Map();
export function useResource(url, transform) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(() => cache.get(url) || { loading: true });
  useEffect(() => {
    if (cache.has(url)) {
      setState(cache.get(url));
      return;
    }
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setState({ loading: true });
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return transform ? r.text().then(transform) : r.json();
      })
      .then((data) => {
        const result = { data, loading: false };
        cache.set(url, result);
        if (alive) setState(result);
      })
      .catch((error) => {
        if (alive) setState({ error: error.message, loading: false });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, transform, attempt]);
  return {
    ...state,
    retry: () => {
      cache.delete(url);
      setAttempt((n) => n + 1);
    },
  };
}
export function useClock() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setDate(new Date());
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return date;
}
export function useRoute() {
  const read = () => {
    const [path, query] = location.hash.slice(1).split("?");
    return {
      view: path?.replace(/^\//, "") || "home",
      params: new URLSearchParams(query),
    };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
