import { Attribute } from '../type';

export default function parseAttributes(
  attributes: { [key: string]: Attribute | number[][] },
) {
  let output: { [key: string]: Attribute } = {};
  for (let key in attributes) {
    output[key] = parseAttribute(attributes[key]);
  }
  return output;
}

export function parseAttribute(attribute: Attribute | number[][]): Attribute {
  if (Array.isArray(attribute)) {
    // Get vector axis size and attribute size
    let axis = attribute[0].length;
    let output = new Float32Array(axis * attribute.length);
    let ptr = 0;
    attribute.forEach(v => {
      for (let i = 0; i < axis; ++i) {
        output[ptr] = v[i];
        ptr ++;
      }
    });
    return {
      axis, data: output,
    };
  }
  // Assume normal object
  return attribute;
}
