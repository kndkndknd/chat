import { redis } from "./client";

type OnChange = () => void;

export function makeDeepProxy<T extends object>(obj: T, onChange: OnChange): T {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (val !== null && typeof val === "object") {
        return makeDeepProxy(val as object, onChange) as any;
      }
      if (typeof val === "function") {
        return function (this: any, ...args: any[]) {
          const result = (val as Function).apply(target, args);
          onChange();
          return result;
        };
      }
      return val;
    },
    set(target, prop, value) {
      Reflect.set(target, prop, value);
      onChange();
      return true;
    },
    deleteProperty(target, prop) {
      Reflect.deleteProperty(target, prop);
      onChange();
      return true;
    },
  });
}

export function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t !== null) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

function deepMerge(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      key in target &&
      target[key] !== null &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

const loaders: Array<() => Promise<void>> = [];

export function createPersistedState<T extends object>(
  key: string,
  base: T,
  debounceMs = 100
): T {
  const save = debounce(() => {
    redis
      .set(`state:${key}`, JSON.stringify(base))
      .catch((e) => console.error(`Redis save error for state:${key}:`, e));
  }, debounceMs);

  const load = async (): Promise<void> => {
    try {
      const raw = await redis.get(`state:${key}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(base) && Array.isArray(saved)) {
        (base as any[]).length = 0;
        (base as any[]).push(...saved);
      } else {
        deepMerge(base, saved);
      }
    } catch (e) {
      console.error(`Redis load error for state:${key}:`, e);
    }
  };

  loaders.push(load);
  return makeDeepProxy(base, save);
}

export async function loadAllStates(): Promise<void> {
  await Promise.all(loaders.map((load) => load()));
}
