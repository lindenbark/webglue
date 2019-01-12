import { Geometry } from './type';

export default function strip(
  geometry: Geometry,
  whitelist: string[]
): Geometry {
  const newAttributes: { [key: string]: any } = {};
  whitelist.forEach(key => {
    if (geometry.attributes[key]) {
      newAttributes[key] = geometry.attributes[key];
    }
  });
  return Object.assign({}, geometry, { attributes: newAttributes });
}
