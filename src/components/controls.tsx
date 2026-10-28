import { useId, type ReactNode } from 'react';

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'seg is-on' : 'seg'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ChoiceGrid({
  label,
  value,
  options,
  onChange,
  selectedMark,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  selectedMark?: string;
}) {
  return (
    <div className="stack">
      <span className="group-label">{label}</span>
      <div role="radiogroup" aria-label={label} className="choices">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-label={option.label}
              aria-checked={selected}
              className={selected ? 'choice is-on' : 'choice'}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              {selected && selectedMark ? <span aria-hidden="true"> {selectedMark}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  decLabel,
  incLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  decLabel: string;
  incLabel: string;
  onChange: (value: number) => void;
}) {
  const atMax = max !== undefined && value >= max;
  const labelId = useId();
  return (
    <div className="field">
      <span id={labelId}>{label}</span>
      <div className="stepper" aria-labelledby={labelId}>
        <button type="button" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <strong>{value}</strong>
        <button type="button" aria-label={incLabel} disabled={atMax} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
