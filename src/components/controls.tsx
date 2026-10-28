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

export function SettingsRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span>{label}</span>
      <span className="settings-value">
        {value}
        <span aria-hidden="true"> ›</span>
      </span>
    </button>
  );
}

export function Toggle({
  label,
  caption,
  checked,
  onChange,
}: {
  label: string;
  caption?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className="switch-ui"
      onClick={() => onChange(!checked)}
    >
      <span>{caption ?? label}</span>
      <span className="track" aria-hidden="true"><span className="knob" /></span>
    </button>
  );
}

export function OptionDialog<T extends string>({
  title,
  open,
  value,
  options,
  onSelect,
  onClose,
}: {
  title: string;
  open: boolean;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-back">
      <div role="dialog" aria-modal="true" aria-label={title} className="modal">
        <h2>{title}</h2>
        <div role="radiogroup" aria-label={title} className="stack">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              className={value === option.value ? 'choice is-on' : 'choice'}
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
      </div>
    </div>
  );
}
