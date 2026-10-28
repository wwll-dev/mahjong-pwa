import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Rules } from '../domain/types';

interface DraftApi {
  draft: Rules | null;
  customId: string | null;
  setDraft: (rules: Rules, customId?: string | null) => void;
  clearDraft: () => void;
}

const DraftContext = createContext<DraftApi | null>(null);

export function RulesDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<Rules | null>(null);
  const [customId, setCustomId] = useState<string | null>(null);

  const api = useMemo<DraftApi>(() => ({
    draft,
    customId,
    setDraft: (rules, nextId = null) => {
      setDraftState(rules);
      setCustomId(nextId);
    },
    clearDraft: () => {
      setDraftState(null);
      setCustomId(null);
    },
  }), [draft, customId]);

  return <DraftContext.Provider value={api}>{children}</DraftContext.Provider>;
}

export function useRulesDraft(): DraftApi {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useRulesDraft 要喺 RulesDraftProvider 入面用');
  return context;
}
