import { useMemo, useState } from 'react';
import { Stepper } from './controls';
import {
  FAN_CATALOG,
  FAN_GROUPS,
  suggestFan,
  type FanPattern,
} from '../domain/fanCatalog';
import type { FanPick } from '../domain/types';

export function FanPicker({
  minFan,
  maxFan,
  onApply,
  onClose,
}: {
  minFan: number;
  maxFan: number;
  onApply: (fan: number, picks: FanPick[]) => void;
  onClose: () => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const picks = useMemo(() => {
    const selected: FanPick[] = [];
    for (const pattern of FAN_CATALOG) {
      const count = counts[pattern.id] ?? 0;
      if (count <= 0) continue;
      if (pattern.maxCount) selected.push({ id: pattern.id, fan: pattern.fan, count });
      else selected.push({ id: pattern.id, fan: pattern.fan });
    }
    return selected;
  }, [counts]);

  const suggestion = suggestFan(picks, minFan, maxFan);

  function setCount(pattern: FanPattern, count: number) {
    setCounts((current) => ({ ...current, [pattern.id]: count }));
  }

  return (
    <div className="modal-back">
      <div role="dialog" aria-modal="true" aria-label="番表" className="modal sheet">
        <h2>番表</h2>
        <p className="hint">揀常見番型加總。套用之後仍然可以手動改番數。</p>
        {FAN_GROUPS.map((group) => (
          <section key={group} aria-label={group}>
            <h3 className="section-label">{group}</h3>
            <div className="stack">
              {FAN_CATALOG.filter((pattern) => pattern.group === group).map((pattern) => (
                pattern.maxCount ? (
                  <Stepper
                    key={pattern.id}
                    label={`${pattern.name}（${pattern.fan}番）`}
                    value={counts[pattern.id] ?? 0}
                    min={0}
                    max={pattern.maxCount}
                    decLabel={`減少${pattern.name}`}
                    incLabel={`增加${pattern.name}`}
                    onChange={(value) => setCount(pattern, value)}
                  />
                ) : (
                  <button
                    key={pattern.id}
                    type="button"
                    aria-pressed={Boolean(counts[pattern.id])}
                    className={counts[pattern.id] ? 'choice is-on' : 'choice'}
                    onClick={() => setCount(pattern, counts[pattern.id] ? 0 : 1)}
                  >
                    {pattern.name}
                    <span className="fan-note"> {pattern.fan} 番</span>
                  </button>
                )
              ))}
            </div>
          </section>
        ))}
        <p className="hint">合計 {suggestion.sum} 番，套用 {suggestion.fan} 番</p>
        {suggestion.overMax ? <p className="warn">超出滿糊，套用會收為 {maxFan} 番</p> : null}
        {suggestion.underMin ? <p className="warn">未夠起糊</p> : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onApply(suggestion.fan, picks);
            onClose();
          }}
        >
          套用
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setCounts({})}>清除選擇</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
      </div>
    </div>
  );
}
