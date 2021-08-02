import { Debouncer } from './Debouncer';

import localForage from 'localforage';

const DEFAULT_DEBOUNCE_MS = 100;

interface Options<Type> {
  key: string;
  default: Type;
  debounceMs?: number;
}

function deepUpdate(target: any, source: any): any {
  const isObject = (x: any) => typeof x === 'object' && x !== null;
  for (const [key, value] of Object.entries(source)) {
    if (!target.hasOwnProperty(key)) {
      if (Array.isArray(value)) {
        target[key] = [...value];
      } else if (isObject(value)) {
        target[key] = deepUpdate({}, value);
      } else {
        target[key] = value;
      }
    } else if (isObject(value) && isObject(target[key])) {
      deepUpdate(target[key], value);
    }
  }
  return target;
}

export class LocalPersistent<Type> {
  private key_: string;
  private cachedValue_: Type;
  private debouncer_: Debouncer;

  constructor(key: string, initialValue: Type, debounceMs: number) {
    this.key_ = key;
    this.cachedValue_ = initialValue;
    this.debouncer_ = new Debouncer(debounceMs);
  }

  set value(value: Type) {
    this.cachedValue_ = value;
    this.debouncer_.invoke(() => localForage.setItem(this.key_, value));
  }

  get value(): Type {
    return this.cachedValue_;
  }
}

function loadValueFromLocalStorage<Type>(key: string): null | Type {
  const serializedValue = localStorage[key];
  let cachedValue = null;
  if (serializedValue) {
    cachedValue = JSON.parse(serializedValue) ?? null;
  }
  if (cachedValue !== null) {
    return cachedValue as Type;
  }
  return null;
}

export async function restoreLocalPersistent<Type>(
  options: Options<Type>
): Promise<LocalPersistent<Type>> {
  const asyncCachedValue = localForage.getItem(options.key);
  const cachedLegacyValue = loadValueFromLocalStorage<Type>(options.key);
  const cachedValue = (await asyncCachedValue) as null | Type;
  let restoredValue: null | Partial<Type> = null;
  if (cachedValue !== null) {
    restoredValue = cachedValue;
  } else {
    restoredValue = cachedLegacyValue ?? {};
  }
  return new LocalPersistent<Type>(
    options.key,
    deepUpdate(restoredValue, options.default),
    options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  );
}
