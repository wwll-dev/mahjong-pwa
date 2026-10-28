import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { windLabel } from '../domain/dealer';
import { formatPoints } from '../domain/format';
import { handDetail, handTitle } from '../domain/handText';
import { rulesTitle } from '../domain/rules';
import type { Player, Session } from '../domain/types';
import { useSession } from '../state/sessionStore';

function ScoreBoard({ player, session }: { player: Player; session: Session }) {
  const isDealer = session.rules.recordDealer && player.id === session.dealerId;
  const tone = player.score > 0 ? 'pos' : player.score < 0 ? 'neg' : '';
  return (
    <article className={isDealer ? 'seat is-dealer' : 'seat'} aria-label={player.name}>
      <div className="seat-top">
        <h2>{player.name}</h2>
        {isDealer ? <span className="badge-dealer">莊</span> : null}
        {isDealer && session.dealerStreak > 0 ? <span className="badge-streak">連×{session.dealerStreak}</span> : null}
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

export function Table() {
  const navigate = useNavigate();
  const { session, undo } = useSession();
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!session) return null;

  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const showWind = session.rules.mode === 'hongkong' && session.rules.recordWind;

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">枱面</h1>
        <div className="table-meta">
          <span className="chip">{rulesTitle(session.rules)}</span>
          {showWind ? <span className="chip">{windLabel(session.wind)}</span> : null}
          {session.rules.mode === 'hongkong' && session.rules.jackpotEnabled ? (
            <span className="chip">獎池 {session.jackpotPool}</span>
          ) : null}
          <p className="hand-no">第 {session.hands.length + 1} 鋪</p>
          {session.hands.length > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={undo}>復原</button>
          ) : null}
        </div>
        <div className={seats.length === 3 ? 'board is-three' : 'board'}>
          {seats.map((player) => (
            <ScoreBoard key={player.id} player={player} session={session} />
          ))}
        </div>
        <LastHandSummary session={session} />
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/hand')}>記一鋪</button>
        {session.rules.mode === 'paoma' ? (
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/kong')}>記槓</button>
        ) : null}
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
