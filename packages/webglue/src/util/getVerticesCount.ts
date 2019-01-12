import { DumbAttribute } from '../type';
import { parseAttribute } from './parseAttributes';

export default function getVerticesCount(
  attributes: { [key: string]: DumbAttribute },
): number {
  for (let key in attributes) {
    let attribute = parseAttribute(attributes[key]);
    return attribute.data.length / attribute.axis;
  }
  throw new Error('There must be at least one attribute');
}
