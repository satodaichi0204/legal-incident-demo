"use client";
// デモの状態を、ブラウザの localStorage に保存する（本番は Supabase）
import { useCallback, useSyncExternalStore } from "react";
import { initialState, parseState, type State } from "./state";

const KEY = "legal_incident_demo_v2";
const SERVER = initialState(new Date());
let cache: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (cache) return cache;
  try {
    cache = parseState(localStorage.getItem(KEY), new Date());
  } catch {
    cache = initialState(new Date());
  }
  return cache;
}
function write(next: State) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できない環境でも、このタブの中では動く
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): [State, (fn: (s: State) => State) => void] {
  const state = useSyncExternalStore(subscribe, read, () => SERVER);
  const update = useCallback((fn: (s: State) => State) => write(fn(read())), []);
  return [state, update];
}
export const resetState = () => write(initialState(new Date()));
