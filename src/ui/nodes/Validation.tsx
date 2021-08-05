import { Connection } from 'react-flow-renderer';

import { Blueprint, EdgeDescriptor, NodeDescriptor } from '../../gpu/Blueprint';

interface ConnectionData {
  source: NodeDescriptor;
  target: NodeDescriptor;
  sourceName: string;
  targetName: string;
  targetHandle: string;
}

function resolveConnection(
  c: Connection,
  blueprint: Blueprint
): null | ConnectionData {
  if (!c.source || !c.target) {
    return null;
  }

  const source = blueprint.nodes[c.source];
  const target = blueprint.nodes[c.target];
  if (!source || !target || !c.targetHandle) {
    return null;
  }

  return {
    source,
    target,
    sourceName: c.source,
    targetName: c.target,
    targetHandle: c.targetHandle,
  };
}

export function isValidBindingConnection(c: Connection, blueprint: Blueprint) {
  const data = resolveConnection(c, blueprint);
  if (!data) {
    return false;
  }

  if (
    data.source.type !== 'buffer' &&
    data.source.type !== 'texture' &&
    data.source.type !== 'sampler'
  ) {
    return false;
  }

  if (data.target.type !== 'render' && data.target.type !== 'compute') {
    return false;
  }

  if (data.targetHandle !== 'bindings') {
    return false;
  }

  if (!blueprint.edges) {
    return true;
  }

  return !Object.values(blueprint.edges).some((e: EdgeDescriptor) => {
    return (
      e.type === 'binding' &&
      e.source === data.sourceName &&
      e.target === data.targetName
    );
  });
}

export function isValidQueueConnection(c: Connection, blueprint: Blueprint) {
  const data = resolveConnection(c, blueprint);
  if (!data) {
    return false;
  }

  if (data.source.type !== 'render' && data.source.type !== 'compute') {
    return false;
  }

  if (data.target.type !== 'render' && data.target.type !== 'compute') {
    return false;
  }

  if (!blueprint.edges) {
    return true;
  }

  return !Object.values(blueprint.edges).some((e: EdgeDescriptor) => {
    return (
      e.type === 'queue-dependency' &&
      (e.source === data.sourceName || e.target === data.targetName)
    );
  });
}
