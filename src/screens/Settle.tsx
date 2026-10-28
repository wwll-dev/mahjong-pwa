import { useNavigate } from 'react-router-dom';
import { formatPoints } from '../domain/format';
import { pairwiseSettle, playerNets, type PairwisePayment } from '../domain/settle';
import type { Session } from '../domain/types';
import { useSession } from '../state/sessionStore';

function nameOf(session: Session, id: string): string {
  return session.players.find((player) => player.id === id)?.name ?? '—';
}

function PairwisePayList({ session, payments }: { session: Session; payments: PairwisePayment[] }) {
  if (payments.length === 0) return <p className="empty">大家打和，無需找數。</p>;
  return (
    <ul className="pay-list" aria-label="兩兩找數">
      {payments.map((payment) => (
        <li key={`${payment.fromId}-${payment.toId}-${payment.amount}`}>
          <span>{nameOf(session, payment.fromId)} 付 {nameOf(session, payment.toId)}</span>
          <strong>{payment.amount}</strong>
        </li>
      ))}
    </ul>
  );
}

export function Settle() {
  const navigate = useNavigate();
  const { session, clearSession } = useSession();
  if (!session) return null;

  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const nets = playerNets(session.players, session.startingScores);
  const payments = pairwiseSettle(nets, session.players);

  function finish() {
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">局結找數</h1>
        <section className="panel">
          <h2>淨額</h2>
          <ul className="net-list" aria-label="淨額">
            {seats.map((player) => {
              const net = nets[player.id] ?? 0;
              return (
                <li key={player.id}>
                  <span>{player.name}</span>
                  <span className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>{formatPoints(net)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel">
          <h2>兩兩找數</h2>
          <PairwisePayList session={session} payments={payments} />
        </section>
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" onClick={finish}>完成（清局）</button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/table')}>返回枱面</button>
      </div>
    </main>
  );
}
