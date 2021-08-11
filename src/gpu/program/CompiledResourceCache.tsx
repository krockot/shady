import { ProgramMap } from './ProgramMap';

interface HasUuid {
  uuid: string;
}

export interface CompiledResource {
  dispose: () => void;
}

type Cache<Resource extends CompiledResource> = Map<string, null | Resource>;

export interface ResourceCompiler<
  Props extends HasUuid,
  Resource extends CompiledResource
> {
  needsRecompile(
    newProps: Props,
    resource: Resource,
    programMap: ProgramMap
  ): boolean;
  compile(props: Props, programMap: ProgramMap): Promise<null | Resource>;
}

export class CompiledResourceCache<
  Props extends HasUuid,
  Resource extends CompiledResource
> {
  private readonly compiler_: ResourceCompiler<Props, Resource>;
  private readonly cache_: Cache<Resource>;

  constructor(compiler: ResourceCompiler<Props, Resource>) {
    this.compiler_ = compiler;
    this.cache_ = new Map();
  }

  get keys() {
    return this.cache_.keys();
  }

  get entries() {
    return Array.from(this.cache_.entries()).filter(
      ([key, value]) => value !== null
    ) as [[string, Resource]];
  }

  get(uuid: string): null | Resource {
    return this.cache_.get(uuid) ?? null;
  }

  releaseKeysAndDisposeRemainder(keys: Iterable<string>) {
    for (const key of Array.from(keys)) {
      this.cache_.delete(key);
    }

    this.dispose();
  }

  dispose() {
    for (const resource of Object.values(this.cache_)) {
      if (resource !== null) {
        resource.dispose();
      }
    }
  }

  async compile(
    entries: Iterable<Props>,
    programMap: ProgramMap
  ): Promise<CompiledResourceCache<Props, Resource>> {
    const newCache = new CompiledResourceCache<Props, Resource>(this.compiler_);
    const pendingUpdates: Map<Props, Promise<null | Resource>> = new Map();
    for (const props of entries) {
      const entry = this.cache_.get(props.uuid);
      if (entry && !this.compiler_.needsRecompile(props, entry, programMap)) {
        newCache.cache_.set(props.uuid, entry);
      } else {
        pendingUpdates.set(props, this.compiler_.compile(props, programMap));
      }
    }

    for (const [props, update] of Array.from(pendingUpdates.entries())) {
      newCache.cache_.set(props.uuid, await update);
    }
    return newCache;
  }
}
