import { PlainType } from './PlainType';

export interface UniformField {
  name: string;
  type: PlainType;
}

export interface UniformLayout {
  fields: UniformField[];
}
