import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useClients, type Client } from "@/hooks/useClients";

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  activeClientId: string | null;
  setActiveClientId: (id: string) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType>({
  clients: [],
  activeClient: null,
  activeClientId: null,
  setActiveClientId: () => {},
  isLoading: true,
});

const STORAGE_KEY = "nudaze.activeClientId";

export function ClientProvider({ children }: { children: ReactNode }) {
  const { clients, isLoading } = useClients();
  const [activeClientId, setActiveClientIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Auto-select first client (prefer NuDaze) once loaded, or reconcile if stored id no longer valid.
  useEffect(() => {
    if (isLoading || clients.length === 0) return;
    const stillValid = activeClientId && clients.some((c) => c.id === activeClientId);
    if (!stillValid) {
      const nudaze = clients.find((c) => c.slug === "nudaze");
      const next = nudaze?.id ?? clients[0].id;
      setActiveClientIdState(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, [isLoading, clients, activeClientId]);

  const setActiveClientId = (id: string) => {
    setActiveClientIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) ?? null,
    [clients, activeClientId]
  );

  return (
    <ClientContext.Provider
      value={{ clients, activeClient, activeClientId, setActiveClientId, isLoading }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export const useActiveClient = () => useContext(ClientContext);
