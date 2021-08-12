import { ID } from '../Blueprint';
import { ProgramMap } from './ProgramMap';

interface ResourceDescriptor {
  id: ID;
}

export interface Resource {
  dispose: () => void;
}

export interface ResourceCompiler<
  DescriptorType extends ResourceDescriptor,
  ResourceType extends Resource
> {
  getCurrentDescriptors(programMap: ProgramMap): Iterable<DescriptorType>;
  needsRecompile(
    descriptor: DescriptorType,
    cachedValue: ResourceType,
    programMap: ProgramMap
  ): boolean;
  compile(
    descriptor: DescriptorType,
    programMap: ProgramMap
  ): Promise<null | ResourceType>;
}

type Cache<ResourceType extends Resource> = Map<ID, null | ResourceType>;

export class ResourceCache<
  DescriptorType extends ResourceDescriptor,
  ResourceType extends Resource
> {
  private readonly compiler_: ResourceCompiler<DescriptorType, ResourceType>;
  private cache_: Cache<ResourceType>;

  constructor(compiler: ResourceCompiler<DescriptorType, ResourceType>) {
    this.compiler_ = compiler;
    this.cache_ = new Map();
  }

  keys() {
    return this.cache_.keys();
  }

  entries() {
    return Array.from(this.cache_.entries()).filter(
      ([key, value]) => value !== null
    ) as [[ID, ResourceType]];
  }

  get(id: ID): null | ResourceType {
    return this.cache_.get(id) ?? null;
  }

  replace(newCache: ResourceCache<DescriptorType, ResourceType>) {
    for (const [id, resource] of this.cache_.entries()) {
      const newResource = newCache.get(id);
      if (!newResource && resource !== null) {
        resource.dispose();
      }
    }
    this.cache_ = newCache.cache_;
  }

  dispose() {
    for (const resource of Object.values(this.cache_)) {
      if (resource !== null) {
        resource.dispose();
      }
    }
  }

  async compile(
    programMap: ProgramMap
  ): Promise<ResourceCache<DescriptorType, ResourceType>> {
    const newCache = new ResourceCache<DescriptorType, ResourceType>(
      this.compiler_
    );
    const pendingUpdates: Map<ID, Promise<null | ResourceType>> = new Map();
    for (const descriptor of this.compiler_.getCurrentDescriptors(programMap)) {
      const entry = this.cache_.get(descriptor.id);
      if (
        entry &&
        !this.compiler_.needsRecompile(descriptor, entry, programMap)
      ) {
        newCache.cache_.set(descriptor.id, entry);
      } else {
        pendingUpdates.set(
          descriptor.id,
          this.compiler_.compile(descriptor, programMap)
        );
      }
    }

    for (const [id, update] of pendingUpdates.entries()) {
      newCache.cache_.set(id, await update);
    }
    return newCache;
  }
}
