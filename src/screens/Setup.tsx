import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChoiceGrid, Field } from '../components/controls';
import { validateSetup } from '../domain/session';
import { useRulesDraft } from '../state/rulesDraft';
import { useSession } from '../state/sessionStore';

const WIND_NAMES = ['東', '南', '西', '北'];

function defaultNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `玩家${index + 1}`);
}

export function Setup() {
  const navigate = useNavigate();
  const { draft } = useRulesDraft();
  const { session, startSession } = useSession();
  const count = draft?.playerCount ?? 4;
  const [names, setNames] = useState<string[]>(() => defaultNames(count));
  const [dealerSeat, setDealerSeat] = useState(0);

  if (!draft) return <Navigate to="/rules" replace />;

  const input = {
    rules: draft,
    names,
    dealerSeat: draft.recordDealer ? dealerSeat : 0,
  };
  const error = names.length === draft.playerCount ? validateSetup(input) : '玩家人數唔啱';

  function rename(index: number, value: string) {
    setNames((current) => current.map((name, item) => (item === index ? value : name)));
  }

  function openTable() {
    if (error) return;
    startSession(input);
    navigate('/table', { replace: true });
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <header className="bar">
          <button type="button" className="icon-btn" aria-label="返回" onClick={() => navigate('/rules/edit')}>‹</button>
          <h1 className="bar-title">開局</h1>
          <span />
        </header>
        <p className="hint">{draft.name.trim() || (draft.mode === 'hongkong' ? '香港麻雀' : '跑馬仔')} · {draft.playerCount} 人</p>
        {session?.status === 'active' ? <p className="replace-note">開枱會取代未完結嘅局。</p> : null}
        <div className="names">
          {names.map((name, index) => (
            <Field key={index} label={`座位 ${index + 1}`}>
              <input
                value={name}
                maxLength={16}
                onChange={(event) => rename(index, event.target.value)}
              />
            </Field>
          ))}
          <button
            type="button"
            className="inline-link"
            onClick={() => setNames(WIND_NAMES.slice(0, draft.playerCount))}
          >
            用東南西北
          </button>
        </div>
        {draft.recordDealer ? (
          <ChoiceGrid
            label="初始莊家"
            selectedMark="莊"
            value={String(dealerSeat)}
            onChange={(value) => setDealerSeat(Number(value))}
            options={names.map((name, index) => ({
              value: String(index),
              label: name.trim() || `座位${index + 1}`,
            }))}
          />
        ) : (
          <p className="hint">呢個玩法唔記錄莊家。</p>
        )}
        {error ? <p className="alert" role="alert">{error}</p> : null}
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" disabled={Boolean(error)} onClick={openTable}>
          開枱
        </button>
      </div>
    </main>
  );
}
