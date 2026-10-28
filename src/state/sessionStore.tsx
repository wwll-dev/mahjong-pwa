import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  createSession,
  recordHand as applyHand,
  undoLastHand,
  type HandDraft,
  type NewSessionInput,
} from '../domain/session';
import type { Session } from '../domain/types';
import { loadSession, saveSession } from './storage';

interface SessionApi {
  session: Session | null;
  startSession: (input: NewSessionInput) => Session;
  recordHand: (draft: HandDraft) => void;
  undo: () => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

function readInitialSession(): Session | null {
  try {
    return loadSession();
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readInitialSession);

  const commit = useCallback((next: Session | null) => {
    saveSession(next);
    setSession(next);
  }, []);

  const api = useMemo<SessionApi>(() => ({
    session,
    startSession: (input) => {
      const next = createSession(input);
      commit(next);
      return next;
    },
    recordHand: (draft) => {
      setSession((current) => {
        if (!current) return current;
        const next = applyHand(current, draft);
        saveSession(next);
        return next;
      });
    },
    undo: () => {
      setSession((current) => {
        if (!current) return current;
        const next = undoLastHand(current);
        saveSession(next);
        return next;
      });
    },
    clearSession: () => commit(null),
  }), [session, commit]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession 要喺 SessionProvider 入面用');
  return context;
}
