import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryEntry, sanitizeHistory } from './history';
import { DEFAULT_OPTIONS, sanitizeOptions } from './options';

const OPTIONS_KEY = 'tomori-pick:options:v1';
const HISTORY_KEY = 'tomori-pick:history:v1';

async function read(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存に失敗してもアプリの動作は継続する
  }
}

export async function loadOptions(): Promise<string[]> {
  const raw = await read(OPTIONS_KEY);
  return raw === null ? [...DEFAULT_OPTIONS] : sanitizeOptions(raw);
}
export const saveOptions = (v: readonly string[]) => write(OPTIONS_KEY, v);

export async function loadHistory(): Promise<HistoryEntry[]> {
  return sanitizeHistory(await read(HISTORY_KEY));
}
export const saveHistory = (v: readonly HistoryEntry[]) => write(HISTORY_KEY, v);
