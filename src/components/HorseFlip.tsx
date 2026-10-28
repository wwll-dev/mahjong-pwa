import { flipHorses, horseBonus, horsesHitCount } from '../domain/horses';

export function HorseFlip({
  horses,
  horseValue,
  onChange,
}: {
  horses: boolean[];
  horseValue: number;
  onChange: (horses: boolean[]) => void;
}) {
  const hit = horsesHitCount(horses);
  const bonus = horseBonus(horseValue, hit);

  function toggle(index: number) {
    onChange(horses.map((value, item) => (item === index ? !value : value)));
  }

  return (
    <section className="stack" aria-label="翻馬">
      <div className="horse-head">
        <span className="group-label">翻馬</span>
        <button type="button" className="btn btn-ghost" onClick={() => onChange(flipHorses(horses.length))}>
          隨機翻
        </button>
      </div>
      {horses.length === 0 ? (
        <p className="hint">呢局冇馬</p>
      ) : (
        <div className="horse-grid">
          {horses.map((hitTile, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={hitTile}
              aria-label={`馬 ${index + 1}${hitTile ? ' 中' : ' 未中'}`}
              className={hitTile ? 'horse is-hit' : 'horse'}
              onClick={() => toggle(index)}
            >
              {hitTile ? '中' : '馬'}
            </button>
          ))}
        </div>
      )}
      <p className="hint">中 {hit} 隻 · H = {bonus}</p>
    </section>
  );
}
