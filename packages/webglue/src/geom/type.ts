export interface Geometry {
  attributes: { [key: string]: any };
  indices: number[] | Uint16Array | Uint32Array;
}
