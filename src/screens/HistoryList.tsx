import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPoints } from '../domain/format';
import type { HistoryEntry } from '../domain/types';
import { deleteHistoryEntry, loadHistory } from '../state/historyStore';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function netLine(entry: HistoryEntry): string {
  return [...entry.session.players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => `${player.name} ${formatPoints(entry.summary.net[player.id] ?? player.score)}`)
    .join(' · ');
}

export function HistoryList() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState(() => loadHistory());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pending = entries.find((entry) => entry.id === pendingId) ?? null;

  function remove(id: string) {
    setEntries(deleteHistoryEntry(id));
    setPendingId(null);
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <header className="bar">
          <button type="button" className="icon-btn" aria-label="返回" onClick={() => navigate('/')}>‹</button>
          <h1 className="bar-title">歷史</h1>
          <span />
        </header>
        {entries.length === 0 ? (
          <p className="empty">未有歷史局</p>
        ) : (
          <ul className="history-list" aria-label="歷史局">
            {entries.map((entry) => (
              <li key={entry.id} className="history-card">
                <Link className="history-link" to={`/history/${entry.id}`}>
                  <strong>{entry.summary.rulesName}</strong>
                  <span className="sub">{formatWhen(entry.archivedAt)}</span>
                  <span className="sub">
                    {entry.summary.playerCount === 3 ? '三人' : '四人'} · {entry.summary.handCount} 鋪
                  </span>
                  <span className="sub">{netLine(entry)}</span>
                </Link>
                <button
                  type="button"
                  className="delete-btn"
                  aria-label={`刪除 ${entry.summary.rulesName} ${formatWhen(entry.archivedAt)}`}
                  onClick={() => setPendingId(entry.id)}
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pending ? (
        <div className="modal-back">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-history-title" className="modal">
            <h2 id="delete-history-title">刪除呢局？</h2>
            <p>刪除後唔可以復原。</p>
            <button type="button" className="btn btn-danger" onClick={() => remove(pending.id)}>刪除</button>
            <button type="button" className="btn btn-secondary" onClick={() => setPendingId(null)}>取消</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
