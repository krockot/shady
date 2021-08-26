import { PlainType } from './plain_type';

export interface UniformField {
  name: string;
  type: PlainType;
}

export interface UniformLayout {
  fields: UniformField[];
}
