import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatPoints } from '../domain/format';
import { handDetail, handTitle } from '../domain/handText';
import type { HistoryEntry } from '../domain/types';
import { deleteHistoryEntry, loadHistory } from '../state/historyStore';

export function HistoryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [entry, setEntry] = useState<HistoryEntry | null>(() => (
    loadHistory().find((item) => item.id === id) ?? null
  ));
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!entry) {
    return (
      <main className="screen">
        <div className="screen-body">
          <h1 className="screen-title">找不到呢局</h1>
          <Link className="btn btn-secondary" to="/history">返回歷史</Link>
        </div>
      </main>
    );
  }

  const session = entry.session;
  const seats = [...session.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const pool = entry.summary.finalPool;

  function remove() {
    if (!entry) return;
    deleteHistoryEntry(entry.id);
    setEntry(null);
    navigate('/history', { replace: true });
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <header className="bar">
          <button type="button" className="icon-btn" aria-label="返回" onClick={() => navigate('/history')}>‹</button>
          <h1 className="bar-title">局詳情</h1>
          <span />
        </header>
        <p className="hint">
          {entry.summary.rulesName} · {entry.summary.playerCount === 3 ? '三人' : '四人'} · {entry.summary.handCount} 鋪
        </p>
        <section className="panel" aria-label="最終分數">
          <h2>最終分數</h2>
          <ul className="net-list">
            {seats.map((player) => {
              const net = entry.summary.net[player.id] ?? player.score;
              return (
                <li key={player.id}>
                  <span>{player.name}</span>
                  <span className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>{formatPoints(net)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        {pool !== undefined ? (
          <p className="hint">{pool === 0 ? '獎池已清' : `獎池剩餘 ${pool}`}</p>
        ) : null}
        <section className="panel" aria-label="牌鋪">
          <h2>牌鋪</h2>
          {session.hands.length === 0 ? <p className="empty">未有牌鋪</p> : null}
          {session.hands.map((hand) => (
            <details key={hand.id} className="hand-block">
              <summary>{handTitle(session, hand)}</summary>
              <p>{handDetail(session, hand)}</p>
              <ul className="preview-list">
                {seats.map((player) => (
                  <li key={player.id}>
                    <span>{player.name}</span>
                    <span className={(hand.deltas[player.id] ?? 0) > 0 ? 'pos' : (hand.deltas[player.id] ?? 0) < 0 ? 'neg' : ''}>
                      {formatPoints(hand.deltas[player.id] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      </div>
      <div className="dock">
        <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>刪除呢局</button>
        <Link className="btn btn-secondary" to="/history">返回歷史</Link>
      </div>
      {confirmDelete ? (
        <div className="modal-back">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-detail-title" className="modal">
            <h2 id="delete-detail-title">刪除呢局？</h2>
            <p>刪除後唔可以復原。</p>
            <button type="button" className="btn btn-danger" onClick={remove}>刪除</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>取消</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
