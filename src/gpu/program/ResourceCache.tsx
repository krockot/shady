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

type Cache<ResourceType extends Resource> = Map<ID, ResourceType>;

interface PendingUpdate<ResourceType extends Resource> {
  id: string;
  update: Promise<null | ResourceType>;
}

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
    return this.cache_.entries();
  }

  get(id: ID): null | ResourceType {
    return this.cache_.get(id) ?? null;
  }

  replace(newCache: ResourceCache<DescriptorType, ResourceType>) {
    for (const [id, resource] of this.cache_.entries()) {
      const newResource = newCache.get(id);
      if (!newResource) {
        resource.dispose();
      }
    }
    this.cache_ = newCache.cache_;
  }

  dispose() {
    for (const resource of Object.values(this.cache_)) {
      resource.dispose();
    }
  }

  async compile(
    programMap: ProgramMap
  ): Promise<ResourceCache<DescriptorType, ResourceType>> {
    const newCache = new ResourceCache<DescriptorType, ResourceType>(
      this.compiler_
    );
    const pendingUpdates: PendingUpdate<ResourceType>[] = [];
    for (const descriptor of this.compiler_.getCurrentDescriptors(programMap)) {
      const entry = this.cache_.get(descriptor.id);
      if (
        entry &&
        !this.compiler_.needsRecompile(descriptor, entry, programMap)
      ) {
        newCache.cache_.set(descriptor.id, entry);
      } else {
        pendingUpdates.push({
          id: descriptor.id,
          update: this.compiler_.compile(descriptor, programMap),
        });
      }
    }

    for (const { id, update } of pendingUpdates) {
      const newResource = await update;
      if (newResource !== null) {
        newCache.cache_.set(id, newResource);
      }
    }
    return newCache;
  }
}
