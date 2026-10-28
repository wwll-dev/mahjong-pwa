import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChoiceGrid, Segmented, Stepper } from '../components/controls';
import { FanPicker } from '../components/FanPicker';
import { HorseFlip } from '../components/HorseFlip';
import { formatPoints } from '../domain/format';
import { horsesHitCount } from '../domain/horses';
import { handError, previewHand, type HandDraft } from '../domain/session';
import type { FanPick } from '../domain/types';
import { useSession } from '../state/sessionStore';

export function Hand() {
  const navigate = useNavigate();
  const { session, recordHand } = useSession();
  const minFan = session?.rules.mode === 'hongkong' ? session.rules.minFan : 1;
  const maxFan = session?.rules.mode === 'hongkong' ? session.rules.maxFan : 13;
  const horseMax = session?.rules.mode === 'paoma' ? session.rules.horseCountMax : 0;
  const [outcome, setOutcome] = useState<'win' | 'draw'>('win');
  const [winnerId, setWinnerId] = useState('');
  const [winType, setWinType] = useState<'discard' | 'selfDraw'>('discard');
  const [discarderId, setDiscarderId] = useState('');
  const [baoPlayerId, setBaoPlayerId] = useState('');
  const [fan, setFan] = useState(minFan);
  const [fanBreakdown, setFanBreakdown] = useState<FanPick[] | undefined>(undefined);
  const [fanOpen, setFanOpen] = useState(false);
  const [horses, setHorses] = useState<boolean[]>(() => Array.from({ length: horseMax }, () => false));
  const [manualHorses, setManualHorses] = useState(false);
  const [horsesHit, setHorsesHit] = useState(0);

  if (!session) return null;
  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const draft = buildDraft();
  const error = handError(session, draft);
  const effect = error ? null : previewHand(session, draft);
  const deltas = effect?.deltas ?? null;
  const showBao = session.rules.mode === 'paoma' && session.rules.baoSelfDraw && outcome === 'win' && winType === 'selfDraw';
  const jackpotOn = session.rules.mode === 'hongkong' && session.rules.jackpotEnabled;

  function chooseWinner(id: string) {
    setWinnerId(id);
    setDiscarderId((current) => (current === id ? '' : current));
    setBaoPlayerId((current) => (current === id ? '' : current));
  }

  function buildDraft(): HandDraft {
    if (outcome === 'draw') return { kind: 'draw' };
    const hit = session?.rules.mode === 'paoma'
      ? (manualHorses ? horsesHit : horsesHitCount(horses))
      : horsesHit;
    if (winType === 'discard') {
      return {
        kind: 'win',
        winnerId,
        winType,
        discarderId,
        fan,
        horsesHit: hit,
        horses: session?.rules.mode === 'paoma' && !manualHorses ? horses : undefined,
        fanBreakdown,
      };
    }
    return {
      kind: 'win',
      winnerId,
      winType,
      baoPlayerId,
      fan,
      horsesHit: hit,
      horses: session?.rules.mode === 'paoma' && !manualHorses ? horses : undefined,
      fanBreakdown,
    };
  }

  function confirm() {
    if (error) return;
    recordHand(draft);
    navigate('/table');
  }

  function applyFan(nextFan: number, picks: FanPick[]) {
    setFan(nextFan);
    setFanBreakdown(picks);
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
              <div className="stack">
                <Stepper
                  label="番"
                  value={fan}
                  min={minFan}
                  max={maxFan}
                  decLabel="減少番"
                  incLabel="增加番"
                  onChange={(value) => {
                    setFan(value);
                    setFanBreakdown(undefined);
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={() => setFanOpen(true)}>番表</button>
              </div>
            ) : manualHorses ? (
              <div className="stack">
                <Stepper
                  label="中幾隻"
                  value={horsesHit}
                  min={0}
                  max={horseMax}
                  decLabel="減少中馬"
                  incLabel="增加中馬"
                  onChange={setHorsesHit}
                />
                <button type="button" className="inline-link" onClick={() => setManualHorses(false)}>改用翻馬</button>
              </div>
            ) : (
              <div className="stack">
                <HorseFlip
                  horses={horses}
                  horseValue={session.rules.horse}
                  onChange={setHorses}
                />
                <button type="button" className="inline-link" onClick={() => setManualHorses(true)}>
                  跳過翻馬、手填隻數
                </button>
              </div>
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
        {deltas && effect ? (
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
            {jackpotOn ? (
              <p className="hint">
                {`入池 每人 ${session.rules.mode === 'hongkong' ? session.rules.jackpotAnte : 0}（共 ${effect.jackpotAnteTotal}）`}
                {outcome === 'draw'
                  ? ' · 流局唔派彩'
                  : effect.jackpotPayout > 0
                    ? ` · 滿糊派彩 ${formatPoints(effect.jackpotPayout)}`
                    : ' · 未滿糊，獎池保留'}
              </p>
            ) : null}
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
      {fanOpen && session.rules.mode === 'hongkong' ? (
        <FanPicker
          minFan={minFan}
          maxFan={maxFan}
          onApply={applyFan}
          onClose={() => setFanOpen(false)}
        />
      ) : null}
    </main>
  );
}
