import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChoiceGrid, Segmented } from '../components/controls';
import { formatPoints } from '../domain/format';
import { handError, previewDeltas, type HandDraft } from '../domain/session';
import type { KongKind } from '../domain/types';
import { useSession } from '../state/sessionStore';

function kongHint(kind: KongKind, claimed: boolean): string {
  if (kind === 'an') return '暗槓：其餘各付雙倍槓分。唔改莊家同圈風。';
  if (kind === 'jia') return '加槓：其餘各付槓分。唔改莊家同圈風。';
  if (claimed) return '點槓：點槓者包槓。唔改莊家同圈風。';
  return '明槓：其餘各付槓分。唔改莊家同圈風。';
}

export function KongSheet() {
  const navigate = useNavigate();
  const { session, recordHand } = useSession();
  const [kongKind, setKongKind] = useState<KongKind>('ming');
  const [kongPlayerId, setKongPlayerId] = useState('');
  const [discarderId, setDiscarderId] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  if (!session) return null;
  if (session.rules.mode !== 'paoma') return <Navigate to="/table" replace />;

  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const claimed = kongKind === 'ming' && Boolean(discarderId);
  const draft: HandDraft = {
    kind: 'kong',
    kongPlayerId,
    kongKind,
    ...(claimed ? { discarderId } : {}),
  };
  const error = handError(session, draft);
  const deltas = error ? null : previewDeltas(session, draft);
  const discarderName = seats.find((player) => player.id === discarderId)?.name;

  function chooseKong(id: string) {
    setKongPlayerId(id);
    setDiscarderId((current) => (current === id ? '' : current));
  }

  function chooseKind(kind: KongKind) {
    setKongKind(kind);
    if (kind !== 'ming') {
      setDiscarderId('');
      setDiscardOpen(false);
    }
  }

  function confirm() {
    if (error) return;
    recordHand(draft);
    navigate('/table');
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">記槓</h1>
        <p className="hint">{kongHint(kongKind, claimed)}</p>
        <Segmented
          label="槓種"
          value={kongKind}
          onChange={chooseKind}
          options={[
            { value: 'ming', label: '明槓' },
            { value: 'an', label: '暗槓' },
            { value: 'jia', label: '加槓' },
          ]}
        />
        <ChoiceGrid
          label="槓牌玩家"
          value={kongPlayerId}
          onChange={chooseKong}
          options={seats.map((player) => ({ value: player.id, label: player.name }))}
        />
        {kongKind === 'ming' ? (
          discardOpen ? (
            <div className="stack">
              <p className="hint">選咗＝點槓者包槓；唔選＝其餘各付</p>
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
              ) : null}
              <button type="button" className="inline-link" onClick={() => setDiscardOpen(false)}>收合</button>
            </div>
          ) : (
            <div className="stack">
              <button type="button" className="disclosure" aria-expanded={false} onClick={() => setDiscardOpen(true)}>
                <span>點槓（可選）</span>
                <span className="settings-value">{discarderName ? `${discarderName} ›` : '›'}</span>
              </button>
              <p className="hint">選咗＝點槓者包槓；唔選＝其餘各付</p>
            </div>
          )
        ) : null}
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
