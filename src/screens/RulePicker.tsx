import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { discardScore } from '../domain/score/hongkongCurve';
import { HONG_KONG_PRESETS, blankHongKongRules } from '../domain/presets/hongkong';
import { PAO_MA_PRESETS, blankPaoMaRules } from '../domain/presets/paoma';
import { cloneRules } from '../domain/rules';
import type { Rules } from '../domain/types';
import { deleteCustomPreset, loadCustomPresets } from '../state/customPresetsStore';
import { useRulesDraft } from '../state/rulesDraft';

function customSummary(rules: Rules): string {
  if (rules.mode === 'paoma') {
    const core = `明槓每位${rules.kong} · 自模${rules.hu}`;
    return rules.playerCount === 3 ? `三麻 · ${core}` : core;
  }
  const people = rules.playerCount === 3 ? '三麻 · ' : '';
  const chong = rules.chongMode === 'full' ? '全銃' : '半銃';
  try {
    const full = discardScore(rules.maxFan, rules);
    return `${people}${chong} · ${rules.minFan}番起糊${rules.startScore} · ${rules.maxFan}番滿糊${full}`;
  } catch {
    return `${people}${chong}`;
  }
}

export function RulePicker() {
  const navigate = useNavigate();
  const { setDraft } = useRulesDraft();
  const [tab, setTab] = useState<'hongkong' | 'paoma'>('hongkong');
  const [customs, setCustoms] = useState(() => loadCustomPresets());
  const presets = tab === 'hongkong' ? HONG_KONG_PRESETS : PAO_MA_PRESETS;
  const visible = customs.filter((preset) => preset.rules.mode === tab);

  function openRules(rules: Rules, customId: string | null) {
    setDraft(cloneRules(rules), customId);
    navigate('/rules/edit');
  }

  function removeCustom(id: string) {
    deleteCustomPreset(id);
    setCustoms(loadCustomPresets());
  }

  return (
    <main className="screen">
      <div className="screen-body has-end-pad">
        <header className="bar">
          <span />
          <h1 className="bar-title">請選擇玩法</h1>
          <button type="button" className="icon-btn" aria-label="關閉" onClick={() => navigate('/')}>×</button>
        </header>
        <div role="tablist" aria-label="玩法" className="mode-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'hongkong'}
            className={tab === 'hongkong' ? 'mode-tab is-on' : 'mode-tab'}
            onClick={() => setTab('hongkong')}
          >
            香港麻雀
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'paoma'}
            className={tab === 'paoma' ? 'mode-tab is-on' : 'mode-tab'}
            onClick={() => setTab('paoma')}
          >
            碰槓牌 (跑馬仔)
          </button>
        </div>
        <section aria-label="自訂玩法" className="stack">
          <h2 className="section-label">自訂玩法</h2>
          {visible.length === 0 ? (
            <div className="empty-card">
              <div className="tile" aria-hidden="true" />
              <p>未有自訂玩法</p>
            </div>
          ) : (
            <div className="preset-list">
              {visible.map((preset) => (
                <div key={preset.id} className="custom-row">
                  <button type="button" className="preset-row" onClick={() => openRules(preset.rules, preset.id)}>
                    <span className="preset-title">{preset.rules.name}</span>
                    <span className="sub">{customSummary(preset.rules)}</span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    aria-label={`刪除 ${preset.rules.name}`}
                    onClick={() => removeCustom(preset.id)}
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn-add"
            onClick={() => openRules(tab === 'hongkong' ? blankHongKongRules() : blankPaoMaRules(), null)}
          >
            ＋增加玩法
          </button>
        </section>
        <section aria-label="預設玩法" className="stack">
          <h2 className="section-label">預設玩法</h2>
          <div className="preset-list">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="preset-row"
                onClick={() => openRules(preset.rules, null)}
              >
                <span className="preset-title">{preset.rules.name}</span>
                <span className="sub">{preset.subtitle}</span>
                <span className="chev" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
