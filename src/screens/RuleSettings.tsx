import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Field, OptionDialog, Segmented, SettingsRow, Stepper, Toggle } from '../components/controls';
import { formatFactor, scoreTable } from '../domain/score/hongkongCurve';
import type { HongKongRules, PaoMaRules } from '../domain/types';
import { rulesError } from '../domain/rules';
import { addCustomPreset, deleteCustomPreset, updateCustomPreset } from '../state/customPresetsStore';
import { useRulesDraft } from '../state/rulesDraft';

function parsePositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value > 0 ? value : null;
}

function parseFactor(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+(?:\.\d*)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function FanRange({
  minFan,
  maxFan,
  onChange,
}: {
  minFan: number;
  maxFan: number;
  onChange: (minFan: number, maxFan: number) => void;
}) {
  const span = 12;
  const left = ((minFan - 1) / span) * 100;
  const width = ((maxFan - minFan) / span) * 100;
  return (
    <div className="fan-range">
      <div className="fan-range-labels">
        <span>{minFan}番起糊</span>
        <span>{maxFan}番滿糊</span>
      </div>
      <div className="fan-sliders">
        <div className="fan-track" aria-hidden="true">
          <div className="fan-fill" style={{ left: `${left}%`, width: `${width}%` }} />
        </div>
        <input
          type="range"
          min={1}
          max={13}
          value={minFan}
          aria-label="起糊番"
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Math.min(next, maxFan), maxFan);
          }}
        />
        <input
          type="range"
          min={1}
          max={13}
          value={maxFan}
          aria-label="滿糊番"
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(minFan, Math.max(next, minFan));
          }}
        />
      </div>
    </div>
  );
}

function ScoreTable({ rules }: { rules: HongKongRules }) {
  const rows = scoreTable(rules);
  return (
    <table className="score-table" aria-label="分數表">
      <thead>
        <tr>
          <th scope="col">番</th>
          <th scope="col">食糊分數</th>
          <th scope="col">
            自摸分數
            <span className="factor-badge">×{formatFactor(rules.selfDrawFactor)}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.fan}>
            <td>{row.fan}</td>
            <td>{row.discard}</td>
            <td>{row.selfDraw}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettingsFrame({
  error,
  notice,
  primaryDisabled,
  saveLabel,
  showDelete,
  onConfirm,
  onSave,
  onDelete,
  children,
}: {
  error: string | null;
  notice: string;
  primaryDisabled: boolean;
  saveLabel: string;
  showDelete: boolean;
  onConfirm: () => void;
  onSave: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <main className="screen">
      <div className="screen-body">
        <header className="bar">
          <button type="button" className="icon-btn" aria-label="返回" onClick={() => navigate('/rules')}>‹</button>
          <h1 className="bar-title">玩法設定</h1>
          <span />
        </header>
        {children}
      </div>
      <div className="dock">
        {notice ? <p className="fineprint">{notice}</p> : null}
        {error ? <p className="alert" role="alert">{error}</p> : null}
        <button type="button" className="btn btn-primary" disabled={primaryDisabled} onClick={onConfirm}>確定</button>
        <button type="button" className="btn btn-secondary" disabled={primaryDisabled} onClick={onSave}>{saveLabel}</button>
        {showDelete ? (
          <button type="button" className="btn btn-danger" onClick={onDelete}>刪除自訂</button>
        ) : null}
      </div>
    </main>
  );
}

function HongKongSettings({ initial, customId }: { initial: HongKongRules; customId: string | null }) {
  const navigate = useNavigate();
  const { setDraft, clearDraft } = useRulesDraft();
  const [name, setName] = useState(initial.name);
  const [playerCount, setPlayerCount] = useState(initial.playerCount);
  const [chongMode, setChongMode] = useState(initial.chongMode);
  const [minFan, setMinFan] = useState(initial.minFan);
  const [maxFan, setMaxFan] = useState(initial.maxFan);
  const [startText, setStartText] = useState(String(initial.startScore));
  const [curve, setCurve] = useState(initial.curve);
  const [factorText, setFactorText] = useState(String(initial.selfDrawFactor));
  const [jackpotEnabled, setJackpotEnabled] = useState(initial.jackpotEnabled);
  const [record, setRecord] = useState(initial.recordDealer);
  const [sheet, setSheet] = useState<'count' | 'chong' | null>(null);
  const [savedId, setSavedId] = useState(customId);
  const [notice, setNotice] = useState('');
  const [nameError, setNameError] = useState('');

  const startScore = parsePositiveInt(startText);
  const selfDrawFactor = parseFactor(factorText);
  const draft: HongKongRules | null = startScore !== null && selfDrawFactor !== null
    ? {
        mode: 'hongkong',
        name: name.trim(),
        playerCount,
        chongMode,
        minFan,
        maxFan,
        startScore,
        curve,
        selfDrawFactor,
        jackpotEnabled,
        recordDealer: record,
        recordWind: record,
      }
    : null;
  const formError = draft ? rulesError(draft) : (startScore === null ? '起糊分要係正整數' : '自摸倍數要大過 0');
  const error = nameError || formError;

  function confirm() {
    if (!draft || formError) return;
    setDraft(draft, savedId);
    navigate('/setup');
  }

  function save() {
    if (!draft || formError) return;
    if (!draft.name) {
      setNotice('');
      setNameError('請填玩法名稱');
      return;
    }
    setNameError('');
    if (savedId) {
      updateCustomPreset(savedId, draft);
      setDraft(draft, savedId);
      setNotice('已儲存到自訂玩法');
      return;
    }
    const created = addCustomPreset(draft);
    setSavedId(created.id);
    setDraft(draft, created.id);
    setNotice('已儲存到自訂玩法');
  }

  function remove() {
    if (!savedId) return;
    deleteCustomPreset(savedId);
    clearDraft();
    navigate('/rules');
  }

  return (
    <SettingsFrame
      error={error}
      notice={notice}
      primaryDisabled={Boolean(formError)}
      saveLabel={savedId ? '儲存自訂' : '另存為自訂'}
      showDelete={Boolean(savedId)}
      onConfirm={confirm}
      onSave={save}
      onDelete={remove}
    >
      <div className="group">
        <SettingsRow
          label="人數"
          value={playerCount === 4 ? '四人麻雀' : '三人麻雀'}
          onClick={() => setSheet('count')}
        />
        <SettingsRow
          label="全銃/半銃"
          value={chongMode === 'full' ? '全銃' : '半銃'}
          onClick={() => setSheet('chong')}
        />
      </div>
      <h2 className="section-label">番數設定</h2>
      <div className="group">
        <FanRange minFan={minFan} maxFan={maxFan} onChange={(min, max) => { setMinFan(min); setMaxFan(max); }} />
        {draft ? <ScoreTable rules={draft} /> : null}
      </div>
      <Segmented
        label="曲線"
        value={curve}
        onChange={setCurve}
        options={[
          { value: 'halfDouble', label: '半辣上' },
          { value: 'fullDouble', label: '辣辣上' },
        ]}
      />
      <label className="inline-field">
        <span>起糊分</span>
        <input inputMode="numeric" aria-label="起糊分" value={startText} onChange={(event) => setStartText(event.target.value)} />
      </label>
      <label className="inline-field">
        <span>自摸倍數</span>
        <input inputMode="decimal" aria-label="自摸倍數" value={factorText} onChange={(event) => setFactorText(event.target.value)} />
      </label>
      <h2 className="section-label">Jackpot</h2>
      <Toggle label="Jackpot" caption="啟用" checked={jackpotEnabled} onChange={setJackpotEnabled} />
      <h2 className="section-label">莊家</h2>
      <Toggle label="紀錄莊家及圈風" caption="紀錄莊家及圈風" checked={record} onChange={setRecord} />
      <Field label="玩法名稱">
        <input aria-label="玩法名稱" maxLength={24} value={name} onChange={(event) => { setName(event.target.value); setNameError(''); }} />
      </Field>
      <OptionDialog
        title="人數"
        open={sheet === 'count'}
        value={String(playerCount)}
        options={[
          { value: '4', label: '四人麻雀' },
          { value: '3', label: '三人麻雀' },
        ]}
        onSelect={(value) => setPlayerCount(value === '3' ? 3 : 4)}
        onClose={() => setSheet(null)}
      />
      <OptionDialog
        title="全銃/半銃"
        open={sheet === 'chong'}
        value={chongMode}
        options={[
          { value: 'full', label: '全銃' },
          { value: 'half', label: '半銃' },
        ]}
        onSelect={setChongMode}
        onClose={() => setSheet(null)}
      />
    </SettingsFrame>
  );
}

function PaoMaSettings({ initial, customId }: { initial: PaoMaRules; customId: string | null }) {
  const navigate = useNavigate();
  const { setDraft, clearDraft } = useRulesDraft();
  const [name, setName] = useState(initial.name);
  const [playerCount, setPlayerCount] = useState(initial.playerCount);
  const [kongText, setKongText] = useState(String(initial.kong));
  const [huText, setHuText] = useState(String(initial.hu));
  const [horseText, setHorseText] = useState(String(initial.horse));
  const [horseMax, setHorseMax] = useState(initial.horseCountMax);
  const [recordDealer, setRecordDealer] = useState(initial.recordDealer);
  const [douDiZhuEnabled, setDouDiZhuEnabled] = useState(initial.douDiZhuEnabled);
  const [baoSelfDraw, setBaoSelfDraw] = useState(initial.baoSelfDraw);
  const [countOpen, setCountOpen] = useState(false);
  const [savedId, setSavedId] = useState(customId);
  const [notice, setNotice] = useState('');
  const [nameError, setNameError] = useState('');

  const kong = parsePositiveInt(kongText);
  const hu = parsePositiveInt(huText);
  const horse = parsePositiveInt(horseText);
  const draft: PaoMaRules | null = kong !== null && hu !== null && horse !== null
    ? {
        mode: 'paoma',
        name: name.trim(),
        playerCount,
        kong,
        hu,
        horse,
        horseCountMax: horseMax,
        baoSelfDraw,
        recordDealer,
        douDiZhuEnabled,
      }
    : null;
  let formError: string | null = null;
  if (!draft) {
    if (kong === null) formError = '槓分要係正整數';
    else if (hu === null) formError = '食糊分要係正整數';
    else formError = '獎馬要係正整數';
  } else {
    formError = rulesError(draft);
  }
  const error = nameError || formError;

  function confirm() {
    if (!draft || formError) return;
    setDraft(draft, savedId);
    navigate('/setup');
  }

  function save() {
    if (!draft || formError) return;
    if (!draft.name) {
      setNotice('');
      setNameError('請填玩法名稱');
      return;
    }
    setNameError('');
    if (savedId) {
      updateCustomPreset(savedId, draft);
      setDraft(draft, savedId);
    } else {
      const created = addCustomPreset(draft);
      setSavedId(created.id);
      setDraft(draft, created.id);
    }
    setNotice('已儲存到自訂玩法');
  }

  function remove() {
    if (!savedId) return;
    deleteCustomPreset(savedId);
    clearDraft();
    navigate('/rules');
  }

  return (
    <SettingsFrame
      error={error}
      notice={notice}
      primaryDisabled={Boolean(formError)}
      saveLabel={savedId ? '儲存自訂' : '另存為自訂'}
      showDelete={Boolean(savedId)}
      onConfirm={confirm}
      onSave={save}
      onDelete={remove}
    >
      <h2 className="section-label">一般設定</h2>
      <label className="inline-field">
        <span>玩法名稱</span>
        <input aria-label="玩法名稱" maxLength={24} value={name} onChange={(event) => { setName(event.target.value); setNameError(''); }} />
      </label>
      <h2 className="section-label">遊戲方式</h2>
      <div className="group">
        <SettingsRow
          label="人數"
          value={playerCount === 4 ? '四人麻雀' : '三人麻雀'}
          onClick={() => setCountOpen(true)}
        />
      </div>
      <h2 className="section-label">分數設定</h2>
      <div className="group">
        <label className="inline-field">
          <span>槓</span>
          <input inputMode="numeric" aria-label="槓" value={kongText} onChange={(event) => setKongText(event.target.value)} />
        </label>
        <label className="inline-field">
          <span>食糊</span>
          <input inputMode="numeric" aria-label="食糊" value={huText} onChange={(event) => setHuText(event.target.value)} />
        </label>
        <label className="inline-field">
          <span>獎馬</span>
          <input inputMode="numeric" aria-label="獎馬" value={horseText} onChange={(event) => setHorseText(event.target.value)} />
        </label>
      </div>
      <Stepper
        label="中馬上限"
        value={horseMax}
        min={0}
        max={8}
        decLabel="減少中馬上限"
        incLabel="增加中馬上限"
        onChange={setHorseMax}
      />
      <h2 className="section-label">莊家</h2>
      <Toggle label="記錄莊家" caption="記錄莊家" checked={recordDealer} onChange={setRecordDealer} />
      <h2 className="section-label">鬥地主(追)</h2>
      <Toggle label="鬥地主（追）" caption="啟用" checked={douDiZhuEnabled} onChange={setDouDiZhuEnabled} />
      <h2 className="section-label">包自摸</h2>
      <Toggle label="包自摸" caption="包自摸" checked={baoSelfDraw} onChange={setBaoSelfDraw} />
      <OptionDialog
        title="人數"
        open={countOpen}
        value={String(playerCount)}
        options={[
          { value: '4', label: '四人麻雀' },
          { value: '3', label: '三人麻雀' },
        ]}
        onSelect={(value) => setPlayerCount(value === '3' ? 3 : 4)}
        onClose={() => setCountOpen(false)}
      />
    </SettingsFrame>
  );
}

export function RuleSettings() {
  const { draft, customId } = useRulesDraft();
  if (!draft) return <Navigate to="/rules" replace />;
  if (draft.mode === 'hongkong') return <HongKongSettings initial={draft} customId={customId} />;
  return <PaoMaSettings initial={draft} customId={customId} />;
}
