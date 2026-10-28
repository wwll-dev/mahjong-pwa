import { Link } from 'react-router-dom';
import { useSession } from '../state/sessionStore';

export function Home() {
  const { session } = useSession();
  const hasActiveSession = session?.status === 'active';

  return (
    <main className="screen home">
      <div className="screen-body">
        <p className="eyebrow">無廣告 · 離線計分</p>
        <h1 className="app-title">麻雀計分</h1>
        <p className="lede">開局二選一：港麻或跑馬仔，整局鎖定。</p>
      </div>
      <div className="dock">
        <Link className="btn btn-primary" to="/setup">新開局</Link>
        {hasActiveSession ? <Link className="btn btn-secondary" to="/table">繼續</Link> : null}
        <p className="fineprint">v1 · 朋友局計分，唔涉及真錢</p>
      </div>
    </main>
  );
}
