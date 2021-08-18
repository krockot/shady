function doCopy<T>(value: T, traversed: Set<any>): T {
  if (Array.isArray(value)) {
    if (traversed.has(value)) {
      throw new Error('cycle detected in deep copy');
    }
    traversed.add(value);
    return value.map(x => doCopy(x, traversed)) as any;
  }

  if (value instanceof Blob) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if (traversed.has(value)) {
      throw new Error('cycle detected in deep copy');
    }
    traversed.add(value);

    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      copy[k] = doCopy(v, traversed);
    }
    return copy as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  throw new Error('value not deep-copyable');
}

export function deepCopy<T extends Record<string, any>>(value: T): T {
  return doCopy(value, new Set());
}

export function deepEquals<T extends Record<string, any>>(a: T, b: T): boolean {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((x, i) => deepEquals(x, b[i]));
  }

  if (a instanceof Blob || b instanceof Blob) {
    return a === b;
  }

  if (typeof a === 'object' && a !== null) {
    if (typeof b !== 'object' || b === null) {
      return false;
    }
    return (
      Object.keys(a).length === Object.keys(b).length &&
      Object.keys(a).every(k => deepEquals(a[k], b[k]))
    );
  }

  return a === b;
}

// Awaits all values on an object, and returns a new object with the same keys
// but all promises resolved.
export async function objectPromiseAll(object: Record<string, any>) {
  return Object.fromEntries(
    await Promise.all(
      Array.from(Object.entries(object)).map(async ([key, value]) => [
        key,
        await value,
      ])
    )
  );
}

export function deepUpdate(target: any, source: any): any {
  function isDict(x: any): x is Record<string, any> {
    return typeof x === 'object' && x !== null && x.constructor === Object;
  }
  for (const [key, value] of Object.entries(source)) {
    if (!target.hasOwnProperty(key)) {
      if (isDict(value) || Array.isArray(value)) {
        target[key] = deepCopy(value);
      } else {
        target[key] = value;
      }
    } else if (isDict(value) && isDict(target[key])) {
      deepUpdate(target[key], value);
    } else if (isDict(value) || Array.isArray(value)) {
      target[key] = deepCopy(value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : DeepPartial<T[K]>;
};
