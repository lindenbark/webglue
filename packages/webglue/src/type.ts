export type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

export interface Attribute {
  axis: number;
  data: number[] | TypedArray;
}

export type DumbAttribute = Attribute | number[][];

export interface Geometry {
  attributes: { [key: string]: DumbAttribute };
}
