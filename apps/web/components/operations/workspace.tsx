"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { StoredRecord } from "@/lib/operations/domains";
export type WorkspaceState = {
  state:
    | "loading"
    | "unconfigured"
    | "signed_out"
    | "forbidden"
    | "error"
    | "connected";
  error?: string;
  project?: { id: string; name: string; deadline: string; budget_won: number };
  role?: "owner" | "admin" | "editor" | "viewer";
  userId?: string;
  records: StoredRecord[];
};
const initial: WorkspaceState = { state: "loading", records: [] };
async function loadWorkspace(signal?: AbortSignal): Promise<WorkspaceState> {
  try {
    const response = await fetch("/api/workspace", {
      cache: "no-store",
      signal,
    });
    const data = await response.json();
    return { ...data, records: data.records ?? [] };
  } catch {
    return {
      state: "error",
      error: "연결 상태를 확인할 수 없습니다. 다시 시도해 주세요.",
      records: [],
    };
  }
}
const Context = createContext<{
  workspace: WorkspaceState;
  refresh: () => Promise<void>;
}>({ workspace: initial, refresh: async () => {} });
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(initial);
  const refresh = useCallback(async () => {
    setWorkspace(await loadWorkspace());
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadWorkspace(controller.signal).then((data) => {
      if (!controller.signal.aborted) setWorkspace(data);
    });
    return () => controller.abort();
  }, []);
  return <Context value={{ workspace, refresh }}>{children}</Context>;
}
export const useWorkspace = () => useContext(Context);
