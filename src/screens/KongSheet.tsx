import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChoiceGrid } from '../components/controls';
import { formatPoints } from '../domain/format';
import { handError, previewDeltas, type HandDraft } from '../domain/session';
import { useSession } from '../state/sessionStore';

export function KongSheet() {
  const navigate = useNavigate();
  const { session, recordHand } = useSession();
  const [kongPlayerId, setKongPlayerId] = useState('');
  const [discarderId, setDiscarderId] = useState('');

  if (!session) return null;
  if (session.rules.mode !== 'paoma') return <Navigate to="/table" replace />;

  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const draft: HandDraft = discarderId
    ? { kind: 'kong', kongPlayerId, discarderId }
    : { kind: 'kong', kongPlayerId };
  const error = handError(session, draft);
  const deltas = error ? null : previewDeltas(session, draft);

  function chooseKong(id: string) {
    setKongPlayerId(id);
    setDiscarderId((current) => (current === id ? '' : current));
  }

  function confirm() {
    if (error) return;
    recordHand(draft);
    navigate('/table');
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">記明槓</h1>
        <p className="hint">明槓：其餘各付槓分。唔改莊家同圈風。</p>
        <ChoiceGrid
          label="槓牌玩家"
          value={kongPlayerId}
          onChange={chooseKong}
          options={seats.map((player) => ({ value: player.id, label: player.name }))}
        />
        <ChoiceGrid
          label="點槓玩家"
          value={discarderId}
          onChange={setDiscarderId}
          options={seats
            .filter((player) => player.id !== kongPlayerId)
            .map((player) => ({ value: player.id, label: player.name }))}
        />
        {discarderId ? (
          <button type="button" className="inline-link" onClick={() => setDiscarderId('')}>唔選點槓</button>
        ) : (
          <p className="hint">點槓可以唔選，分數一樣。</p>
        )}
        {deltas ? (
          <section className="panel" aria-label="本鋪預覽">
            <h2>本鋪預覽</h2>
            <ul className="preview-list">
              {seats.map((player) => (
                <li key={player.id}>
                  <span>{player.name}</span>
                  <span className={(deltas[player.id] ?? 0) > 0 ? 'pos' : (deltas[player.id] ?? 0) < 0 ? 'neg' : ''}>
                    {formatPoints(deltas[player.id] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {error ? <p className="alert" role="alert">{error}</p> : null}
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" disabled={Boolean(error)} onClick={confirm}>
          確認入帳
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/table')}>取消</button>
      </div>
    </main>
  );
}
