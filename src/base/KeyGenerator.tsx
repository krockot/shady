type IdMap = Map<string, number>;

export class KeyGenerator {
  private nextIdMap_: WeakMap<any, IdMap>;

  constructor() {
    this.nextIdMap_ = new WeakMap();
  }

  generateKey(object: Record<string, any>, maybePrefix?: string): string {
    let idMap = this.nextIdMap_.get(object);
    if (!idMap) {
      idMap = new Map();
      this.nextIdMap_.set(object, idMap);
    }

    const prefix = maybePrefix ?? '';
    let nextId = idMap.get(prefix) ?? 0;
    const nextKey = () => `${prefix}${nextId}`;
    while (object.hasOwnProperty(nextKey())) {
      ++nextId;
    }
    idMap.set(prefix, nextId + 1);
    return nextKey();
  }
}
