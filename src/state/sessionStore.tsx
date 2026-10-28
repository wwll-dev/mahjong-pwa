import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  createSession,
  recordHand as applyHand,
  undoLastHand,
  type HandDraft,
  type NewSessionInput,
} from '../domain/session';
import type { Session } from '../domain/types';
import type { LegacySession } from './guards';
import { archiveSession } from './historyStore';
import { discardLegacySession, loadLegacySession, loadSession, saveSession } from './storage';

interface SessionApi {
  session: Session | null;
  legacy: LegacySession | null;
  startSession: (input: NewSessionInput) => Session;
  recordHand: (draft: HandDraft) => void;
  undo: () => void;
  clearSession: () => void;
  finishSession: () => void;
  discardLegacy: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

function readInitialSession(): Session | null {
  try {
    return loadSession();
  } catch {
    return null;
  }
}

function readInitialLegacy(): LegacySession | null {
  try {
    return loadLegacySession();
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readInitialSession);
  const [legacy, setLegacy] = useState<LegacySession | null>(readInitialLegacy);

  const commit = useCallback((next: Session | null) => {
    saveSession(next);
    setSession(next);
  }, []);

  const api = useMemo<SessionApi>(() => ({
    session,
    legacy,
    startSession: (input) => {
      const next = createSession(input);
      commit(next);
      return next;
    },
    recordHand: (draft) => {
      setSession((current) => {
        if (!current || current.status !== 'active') return current;
        const next = applyHand(current, draft);
        saveSession(next);
        return next;
      });
    },
    undo: () => {
      setSession((current) => {
        if (!current || current.status !== 'active') return current;
        const next = undoLastHand(current);
        saveSession(next);
        return next;
      });
    },
    clearSession: () => commit(null),
    finishSession: () => {
      setSession((current) => {
        if (current) archiveSession(current);
        saveSession(null);
        return null;
      });
    },
    discardLegacy: () => {
      discardLegacySession();
      setLegacy(null);
    },
  }), [session, legacy, commit]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession 要喺 SessionProvider 入面用');
  return context;
}
