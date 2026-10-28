import { createId } from '../domain/id';
import { rulesError } from '../domain/rules';
import type { CustomPreset, Rules } from '../domain/types';
import { isCustomPreset } from './guards';
import { defaultStorage, type StorageLike } from './storage';

export const CUSTOM_PRESETS_KEY = 'mahjong-pwa:v2:customPresets';

export function loadCustomPresets(storage: StorageLike = defaultStorage()): CustomPreset[] {
  try {
    const raw = storage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomPreset);
  } catch {
    return [];
  }
}

function write(presets: CustomPreset[], storage: StorageLike): void {
  storage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
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
