import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChoiceGrid, Segmented, Stepper } from '../components/controls';
import { formatPoints } from '../domain/format';
import { handError, previewDeltas, type HandDraft } from '../domain/session';
import { useSession } from '../state/sessionStore';

export function Hand() {
  const navigate = useNavigate();
  const { session, recordHand } = useSession();
  const minFan = session?.rules.mode === 'hongkong' ? session.rules.minFan : 1;
  const maxFan = session?.rules.mode === 'hongkong' ? session.rules.maxFan : 13;
  const [outcome, setOutcome] = useState<'win' | 'draw'>('win');
  const [winnerId, setWinnerId] = useState('');
  const [winType, setWinType] = useState<'discard' | 'selfDraw'>('discard');
  const [discarderId, setDiscarderId] = useState('');
  const [baoPlayerId, setBaoPlayerId] = useState('');
  const [fan, setFan] = useState(minFan);
  const [horsesHit, setHorsesHit] = useState(0);

  if (!session) return null;
  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const draft = buildDraft();
  const error = handError(session, draft);
  const deltas = error ? null : previewDeltas(session, draft);
  const showBao = session.rules.mode === 'paoma' && session.rules.baoSelfDraw && outcome === 'win' && winType === 'selfDraw';
  const horseMax = session.rules.mode === 'paoma' ? session.rules.horseCountMax : 0;

  function chooseWinner(id: string) {
    setWinnerId(id);
    setDiscarderId((current) => (current === id ? '' : current));
    setBaoPlayerId((current) => (current === id ? '' : current));
  }

  function buildDraft(): HandDraft {
    if (outcome === 'draw') return { kind: 'draw' };
    if (winType === 'discard') {
      return { kind: 'win', winnerId, winType, discarderId, fan, horsesHit };
    }
    return { kind: 'win', winnerId, winType, baoPlayerId, fan, horsesHit };
  }

  function confirm() {
    if (error) return;
    recordHand(draft);
    navigate('/table');
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">記一鋪</h1>
        <Segmented
          label="結果"
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: 'win', label: '食糊' },
            { value: 'draw', label: '流局' },
          ]}
        />
        {outcome === 'win' ? (
          <div className="stack">
            <ChoiceGrid
              label="胡牌玩家"
              value={winnerId}
              onChange={chooseWinner}
              options={seats.map((player) => ({ value: player.id, label: player.name }))}
            />
            <Segmented
              label="食糊方式"
              value={winType}
              onChange={setWinType}
              options={[
                { value: 'discard', label: '出銃' },
                { value: 'selfDraw', label: '自摸' },
              ]}
            />
            {winType === 'discard' ? (
              <ChoiceGrid
                label="出銃玩家"
                value={discarderId}
                onChange={setDiscarderId}
                options={seats
                  .filter((player) => player.id !== winnerId)
                  .map((player) => ({ value: player.id, label: player.name }))}
              />
            ) : null}
            {session.rules.mode === 'hongkong' ? (
              <Stepper
                label="番"
                value={fan}
                min={minFan}
                max={maxFan}
                decLabel="減少番"
                incLabel="增加番"
                onChange={setFan}
              />
            ) : (
              <Stepper
                label="中幾隻"
                value={horsesHit}
                min={0}
                max={horseMax}
                decLabel="減少中馬"
                incLabel="增加中馬"
                onChange={setHorsesHit}
              />
            )}
            {showBao ? (
              <ChoiceGrid
                label="包自摸玩家"
                value={baoPlayerId}
                onChange={setBaoPlayerId}
                options={seats
                  .filter((player) => player.id !== winnerId)
                  .map((player) => ({ value: player.id, label: player.name }))}
              />
            ) : null}
          </div>
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
