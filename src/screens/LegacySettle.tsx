import { Navigate, useNavigate } from 'react-router-dom';
import { formatPoints } from '../domain/format';
import { pairwiseSettle, playerNets } from '../domain/settle';
import { useSession } from '../state/sessionStore';

export function LegacySettle() {
  const navigate = useNavigate();
  const { legacy, discardLegacy } = useSession();
  if (!legacy) return <Navigate to="/" replace />;

  const seats = [...legacy.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const nets = playerNets(legacy.players, legacy.startingScores);
  const payments = pairwiseSettle(nets, legacy.players);

  function discard() {
    discardLegacy();
    navigate('/', { replace: true });
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">舊局找數</h1>
        <p className="hint">舊局只可找數／或丟棄。唔可以用新分數表續鋪。</p>
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
          {payments.length === 0 ? <p className="empty">大家打和，無需找數。</p> : (
            <ul className="pay-list" aria-label="兩兩找數">
              {payments.map((payment) => (
                <li key={`${payment.fromId}-${payment.toId}-${payment.amount}`}>
                  <span>
                    {seats.find((player) => player.id === payment.fromId)?.name} 付 {seats.find((player) => player.id === payment.toId)?.name}
                  </span>
                  <strong>{payment.amount}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="dock">
        <button type="button" className="btn btn-danger" onClick={discard}>丟棄</button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>返回</button>
      </div>
    </main>
  );
}
