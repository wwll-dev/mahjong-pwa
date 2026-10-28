import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPoints } from '../domain/format';
import type { HandRecord, Player, Session } from '../domain/types';
import { useSession } from '../state/sessionStore';

function playerName(session: Session, id?: string): string {
  return session.players.find((player) => player.id === id)?.name ?? '—';
}

function ScoreBoard({
  player,
  dealerId,
  dealerStreak,
}: {
  player: Player;
  dealerId: string;
  dealerStreak: number;
}) {
  const isDealer = player.id === dealerId;
  const tone = player.score > 0 ? 'pos' : player.score < 0 ? 'neg' : '';
  return (
    <article className={isDealer ? 'seat is-dealer' : 'seat'} aria-label={player.name}>
      <div className="seat-top">
        <h2>{player.name}</h2>
        {isDealer ? <span className="badge-dealer">莊</span> : null}
        {isDealer && dealerStreak > 0 ? <span className="badge-streak">連×{dealerStreak}</span> : null}
      </div>
      <p className={`seat-score ${tone}`}>{formatPoints(player.score)}</p>
    </article>
  );
}

function LastHandSummary({ session }: { session: Session }) {
  const hand = session.hands[session.hands.length - 1];
  if (!hand) return <p className="empty">未有牌鋪</p>;
  return (
    <section className="summary" aria-label="上一鋪">
      <div className="summary-top">
        <h2>{handTitle(session, hand)}</h2>
      </div>
      <p>{handDetail(session, hand)}</p>
    </section>
  );
}

function handTitle(session: Session, hand: HandRecord): string {
  if (hand.outcome === 'draw') return `第 ${hand.index} 鋪 · 流局`;
  const how = hand.winType === 'selfDraw' ? '自摸' : `出銃 ${playerName(session, hand.discarderId)}`;
  return `第 ${hand.index} 鋪 · ${playerName(session, hand.winnerId)} ${how}`;
}

function handDetail(session: Session, hand: HandRecord): string {
  const dealerNote = hand.dealerIdBefore === hand.dealerIdAfter ? '連莊' : '過莊';
  if (hand.outcome === 'draw') return `分數不變 · ${dealerNote}`;
  const extra = session.rules.mode === 'hongkong' ? `${hand.fan} 番` : `中 ${hand.horsesHit} 隻`;
  const bao = hand.baoPlayerId ? `包 ${playerName(session, hand.baoPlayerId)}` : '';
  const moves = [...session.players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .filter((player) => hand.deltas[player.id])
    .map((player) => `${player.name} ${formatPoints(hand.deltas[player.id])}`)
    .join(' · ');
  return [extra, bao, moves, dealerNote].filter(Boolean).join(' · ');
}

export function Table() {
  const navigate = useNavigate();
  const { session, undo } = useSession();
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!session) return null;

  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const modeLabel = session.rules.mode === 'hongkong' ? '港麻' : '跑馬仔';

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">枱面</h1>
        <div className="table-meta">
          <span className="chip">{modeLabel}</span>
          <p className="hand-no">第 {session.hands.length + 1} 鋪</p>
          {session.hands.length > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={undo}>Undo</button>
          ) : null}
        </div>
        <div className="board">
          {seats.map((player) => (
            <ScoreBoard
              key={player.id}
              player={player}
              dealerId={session.dealerId}
              dealerStreak={session.dealerStreak}
            />
          ))}
        </div>
        <LastHandSummary session={session} />
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/hand')}>記一鋪</button>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmEnd(true)}>結束並找數</button>
      </div>
      {confirmEnd ? (
        <div className="modal-back">
          <div role="dialog" aria-modal="true" aria-labelledby="end-title" className="modal">
            <h2 id="end-title">結束並找數？</h2>
            <p>可以返回枱面繼續。清局之後先會刪走呢局。</p>
            <button type="button" className="btn btn-danger" onClick={() => navigate('/settle')}>去找數</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmEnd(false)}>取消</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
