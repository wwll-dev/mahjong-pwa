import { Link } from 'react-router-dom';
import { useSession } from '../state/sessionStore';

export function Home() {
  const { session, legacy, discardLegacy } = useSession();
  const hasActiveSession = session?.status === 'active';

  return (
    <main className="screen home">
      <div className="screen-body">
        <p className="eyebrow">無廣告 · 離線計分</p>
        <h1 className="app-title">麻雀計分</h1>
        <p className="lede">揀香港麻雀或跑馬仔，再開枱。</p>
        {legacy ? (
          <section className="panel" aria-label="舊局">
            <h2>舊版本牌局</h2>
            <p>舊局只可找數／或丟棄</p>
            <div className="stack">
              <Link className="btn btn-secondary" to="/legacy">找數</Link>
              <button type="button" className="btn btn-danger" onClick={discardLegacy}>丟棄</button>
            </div>
          </section>
        ) : null}
      </div>
      <div className="dock">
        <Link className="btn btn-primary" to="/rules">新開局</Link>
        {hasActiveSession ? <Link className="btn btn-secondary" to="/table">繼續</Link> : null}
        <Link className="btn btn-secondary" to="/history">歷史</Link>
        <p className="fineprint">v3 · 朋友局計分，唔涉及真錢</p>
      </div>
    </main>
  );
}
