import { Debouncer } from './Debouncer';

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

  constructor(options: Options<Type>) {
    this.key_ = options.key;

    const serializedValue = localStorage[this.key_];
    let cachedValue = {};
    if (serializedValue) {
      cachedValue = JSON.parse(serializedValue) ?? {};
    }
    this.cachedValue_ = deepUpdate(cachedValue, options.default) as Type;

    this.debouncer_ = new Debouncer(options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  }

  set value(value: Type) {
    this.cachedValue_ = value;
    this.debouncer_.invoke(
      () => (localStorage[this.key_] = JSON.stringify(value))
    );
  }

  get value(): Type {
    return this.cachedValue_;
  }
}
