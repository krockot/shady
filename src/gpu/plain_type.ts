export type PlainType = ScalarType | CompositeType;
export type ScalarType = 'bool' | 'i32' | 'u32' | 'f32';
export type CompositeType = VectorType | MatrixType;
export type VectorGeneric = 'vec2' | 'vec3' | 'vec4';
export type MatrixGeneric =
  | 'mat2x2'
  | 'mat3x2'
  | 'mat4x2'
  | 'mat2x3'
  | 'mat3x3'
  | 'mat4x3'
  | 'mat2x4'
  | 'mat3x4'
  | 'mat4x4';

export interface VectorType {
  vectorType: VectorGeneric;
  componentType: ScalarType;
}

export interface MatrixType {
  matrixType: MatrixGeneric;
  componentType: ScalarType;
}

// TODO: Represent arrays
