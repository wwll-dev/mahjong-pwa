import { createId } from '../domain/id';
import { rulesError } from '../domain/rules';
import type { CustomPreset, Rules } from '../domain/types';
import { coerceRules } from './guards';
import { defaultStorage, type StorageLike } from './storage';

export const CUSTOM_PRESETS_KEY = 'mahjong-pwa:v3:customPresets';
export const LEGACY_V2_PRESETS_KEY = 'mahjong-pwa:v2:customPresets';

function readPresetList(key: string, storage: StorageLike): CustomPreset[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const presets: CustomPreset[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const record = item as { id?: unknown; createdAt?: unknown; rules?: unknown };
      if (typeof record.id !== 'string' || typeof record.createdAt !== 'string') continue;
      const rules = coerceRules(record.rules);
      if (!rules) continue;
      presets.push({ id: record.id, createdAt: record.createdAt, rules });
    }
    return presets;
  } catch {
    return [];
  }
}

export function loadCustomPresets(storage: StorageLike = defaultStorage()): CustomPreset[] {
  if (storage.getItem(CUSTOM_PRESETS_KEY) !== null) return readPresetList(CUSTOM_PRESETS_KEY, storage);
  return readPresetList(LEGACY_V2_PRESETS_KEY, storage);
}

function write(presets: CustomPreset[], storage: StorageLike): void {
  storage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  storage.removeItem(LEGACY_V2_PRESETS_KEY);
}

export function addCustomPreset(
  rules: Rules,
  storage: StorageLike = defaultStorage(),
  now = new Date().toISOString(),
): CustomPreset {
  const error = rulesError({ ...rules, name: rules.name.trim() });
  if (error) throw new Error(error);
  if (!rules.name.trim()) throw new Error('請填玩法名稱');
  const preset: CustomPreset = {
    id: createId(),
    rules: { ...rules, name: rules.name.trim() },
    createdAt: now,
  };
  const presets = loadCustomPresets(storage);
  write([preset, ...presets], storage);
  return preset;
}

export function updateCustomPreset(
  id: string,
  rules: Rules,
  storage: StorageLike = defaultStorage(),
): CustomPreset {
  const error = rulesError({ ...rules, name: rules.name.trim() });
  if (error) throw new Error(error);
  if (!rules.name.trim()) throw new Error('請填玩法名稱');
  const presets = loadCustomPresets(storage);
  const index = presets.findIndex((preset) => preset.id === id);
  if (index < 0) throw new Error('找不到自訂玩法');
  const current = presets[index];
  if (!current) throw new Error('找不到自訂玩法');
  const next: CustomPreset = {
    ...current,
    rules: { ...rules, name: rules.name.trim() },
  };
  presets[index] = next;
  write(presets, storage);
  return next;
}

export function deleteCustomPreset(id: string, storage: StorageLike = defaultStorage()): void {
  write(loadCustomPresets(storage).filter((preset) => preset.id !== id), storage);
}
