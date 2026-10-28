import { describe, expect, it } from 'vitest';
import { blankHongKongRules } from '../domain/presets/hongkong';
import { blankPaoMaRules } from '../domain/presets/paoma';
import type { StorageLike } from './storage';
import {
  CUSTOM_PRESETS_KEY,
  LEGACY_V2_PRESETS_KEY,
  addCustomPreset,
  deleteCustomPreset,
  loadCustomPresets,
  updateCustomPreset,
} from './customPresetsStore';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

describe('custom presets', () => {
  it('adds, updates, reads, and deletes presets for both modes', () => {
    const storage = memoryStorage();
    const hongKong = addCustomPreset(
      { ...blankHongKongRules(), name: '我的港麻', startScore: 5 },
      storage,
      '2026-01-01T00:00:00.000Z',
    );
    const paoMa = addCustomPreset(
      { ...blankPaoMaRules(), name: '我的跑馬', kong: 7, hu: 9, horse: 11 },
      storage,
      '2026-01-02T00:00:00.000Z',
    );
    expect(loadCustomPresets(storage).map((preset) => preset.rules.name)).toEqual(['我的跑馬', '我的港麻']);
    expect(storage.getItem(CUSTOM_PRESETS_KEY)).toContain('我的港麻');

    if (hongKong.rules.mode !== 'hongkong') throw new Error('mode');
    const updated = updateCustomPreset(hongKong.id, { ...hongKong.rules, name: '改名港麻', jackpotEnabled: true }, storage);
    expect(updated.rules.name).toBe('改名港麻');
    expect(updated.rules.mode === 'hongkong' && updated.rules.jackpotEnabled).toBe(true);
    expect(loadCustomPresets(storage).find((preset) => preset.id === paoMa.id)?.rules).toMatchObject({
      mode: 'paoma',
      kong: 7,
      hu: 9,
      horse: 11,
    });

    deleteCustomPreset(paoMa.id, storage);
    expect(loadCustomPresets(storage).map((preset) => preset.id)).toEqual([hongKong.id]);
    deleteCustomPreset(hongKong.id, storage);
    expect(loadCustomPresets(storage)).toEqual([]);
  });

  it('fills a missing v2 jackpot ante from the starting score', () => {
    const storage = memoryStorage();
    const rules = blankHongKongRules();
    const legacyRules: Record<string, unknown> = { ...rules, name: '舊自訂' };
    delete legacyRules.jackpotAnte;
    storage.setItem(LEGACY_V2_PRESETS_KEY, JSON.stringify([
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z', rules: legacyRules },
    ]));
    const loaded = loadCustomPresets(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.rules.mode === 'hongkong' && loaded[0].rules.jackpotAnte).toBe(rules.startScore);
  });

  it('requires a name and skips corrupt entries', () => {
    const storage = memoryStorage();
    expect(() => addCustomPreset(blankHongKongRules(), storage)).toThrow(/名稱/);
    const kept = addCustomPreset({ ...blankPaoMaRules(), name: '留低' }, storage);
    storage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify([
      { id: 'bad', createdAt: 't', rules: { mode: 'taiwan' } },
      kept,
    ]));
    expect(loadCustomPresets(storage)).toEqual([kept]);
  });
});
