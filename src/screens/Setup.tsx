import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChoiceGrid, Field, Segmented, Stepper } from '../components/controls';
import { validateSetup, type NewSessionInput } from '../domain/session';
import { useSession } from '../state/sessionStore';

const WIND_NAMES: [string, string, string, string] = ['東', '南', '西', '北'];

function parseDigits(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export function Setup() {
  const navigate = useNavigate();
  const { session, startSession } = useSession();
  const [mode, setMode] = useState<'hongkong' | 'paoma'>('hongkong');
  const [names, setNames] = useState<[string, string, string, string]>(['玩家1', '玩家2', '玩家3', '玩家4']);
  const [dealerSeat, setDealerSeat] = useState<0 | 1 | 2 | 3>(0);
  const [baseScore, setBaseScore] = useState('1');
  const [chongMode, setChongMode] = useState<'full' | 'half'>('full');
  const [multiplier, setMultiplier] = useState('2');
  const [horseCount, setHorseCount] = useState(0);
  const [horseUnit, setHorseUnit] = useState('1');
  const [horseUnitTouched, setHorseUnitTouched] = useState(false);
  const [baoSelfDraw, setBaoSelfDraw] = useState(true);

  const base = parseDigits(baseScore);
  const mult = parseDigits(multiplier);
  const unit = parseDigits(horseUnit);
  let error: string | null = null;
  if (base === null) error = '底分要係正整數';
  else if (mode === 'hongkong' && mult === null) error = '自摸倍數至少 1';
  else if (mode === 'paoma' && unit === null) error = '馬分要係整數';
  else {
    const input: NewSessionInput = {
      mode,
      names,
      dealerSeat,
      baseScore: base,
      chongMode,
      selfDrawMultiplier: mult ?? 2,
      horseCount,
      horseUnit: unit ?? 0,
      baoSelfDraw,
    };
    error = validateSetup(input);
  }

  function updateBase(next: string) {
    setBaseScore(next);
    if (!horseUnitTouched) setHorseUnit(next);
  }

  function rename(index: number, value: string) {
    setNames((current) => {
      const next = [...current] as [string, string, string, string];
      next[index] = value;
      return next;
    });
  }

  function openTable() {
    if (error || base === null) return;
    startSession({
      mode,
      names,
      dealerSeat,
      baseScore: base,
      chongMode,
      selfDrawMultiplier: mult ?? 2,
      horseCount,
      horseUnit: unit ?? base,
      baoSelfDraw,
    });
    navigate('/table', { replace: true });
  }

  return (
    <main className="screen">
      <div className="screen-body">
        <h1 className="screen-title">開局設定</h1>
        <p className="hint">開局之後唔可以改玩法。</p>
        {session?.status === 'active' ? <p className="replace-note">開枱會取代未完結嘅局。</p> : null}
        <Segmented
          label="玩法"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'hongkong', label: '港麻' },
            { value: 'paoma', label: '跑馬仔' },
          ]}
        />
        <div className="names">
          {names.map((name, index) => (
            <Field key={index} label={`座位 ${index + 1}`}>
              <input
                value={name}
                maxLength={16}
                onChange={(event) => rename(index, event.target.value)}
              />
            </Field>
          ))}
          <button type="button" className="inline-link" onClick={() => setNames(WIND_NAMES)}>
            用東南西北
          </button>
        </div>
        <ChoiceGrid
          label="初始莊家"
          selectedMark="莊"
          value={String(dealerSeat)}
          onChange={(value) => setDealerSeat(Number(value) as 0 | 1 | 2 | 3)}
          options={names.map((name, index) => ({
            value: String(index),
            label: name.trim() || `座位${index + 1}`,
          }))}
        />
        <Field label="底分">
          <input inputMode="numeric" value={baseScore} onChange={(event) => updateBase(event.target.value)} />
        </Field>
        {mode === 'hongkong' ? (
          <div className="stack">
            <Segmented
              label="銃法"
              value={chongMode}
              onChange={setChongMode}
              options={[
                { value: 'full', label: '全銃' },
                { value: 'half', label: '半銃' },
              ]}
            />
            <Field label="自摸倍數">
              <input inputMode="numeric" value={multiplier} onChange={(event) => setMultiplier(event.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="stack">
            <Stepper
              label="總馬數"
              value={horseCount}
              min={0}
              max={8}
              decLabel="減少馬數"
              incLabel="增加馬數"
              onChange={setHorseCount}
            />
            <Field label="每隻馬分">
              <input
                inputMode="numeric"
                value={horseUnit}
                onChange={(event) => {
                  setHorseUnitTouched(true);
                  setHorseUnit(event.target.value);
                }}
              />
            </Field>
            <button
              type="button"
              role="switch"
              aria-label="包自摸"
              aria-checked={baoSelfDraw}
              className="switch"
              onClick={() => setBaoSelfDraw((current) => !current)}
            >
              <span>包自摸</span>
              <strong>{baoSelfDraw ? '開' : '關'}</strong>
            </button>
          </div>
        )}
        {error ? <p className="alert" role="alert">{error}</p> : null}
      </div>
      <div className="dock">
        <button type="button" className="btn btn-primary" disabled={Boolean(error)} onClick={openTable}>
          開枱
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
          返回
        </button>
      </div>
    </main>
  );
}
