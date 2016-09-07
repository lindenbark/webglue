import parseAttributes from '../util/parseAttributes';
import parseIndices from '../util/parseIndices';
import createIndicesArray from '../util/createIndicesArray';
import unwrapInstanced from './unwrapInstanced';
import { TRIANGLES } from '../renderer/geometry';

export default function combine(input) {
  // Parse the attributes and indices first
  let geometries = input.map(geometry => {
    // If instanced, we must unwrap it to combine it to single draw call.
    // But this behavior is kinda weird though.
    if (geometry.instanced) return unwrapInstanced(geometry);
    return {
      attributes: parseAttributes(geometry.attributes),
      indices: parseIndices(geometry.indices),
      mode: geometry.mode
    };
  });
  // TODO Support merging multiple modes (Is it even necessary??)
  let mode = geometries.reduce((mode, geometry) => {
    let geomMode = geometry.mode == null ? TRIANGLES : geometry.mode;
    if (mode == null) return geomMode;
    if (mode !== geomMode) throw new Error('Geometry mode mismatch');
    return mode;
  }, null);
  // First, calculate vertices count per geometry, while creating attribute
  // information (side-effect).
  let attributes = {};
  let vertexCounts = geometries.map(geometry => {
    let vertexCount = -1;
    for (let i in geometry.attributes) {
      let attribute = geometry.attributes[i];
      if (vertexCount === -1) {
        vertexCount = attribute.data.length / attribute.axis;
      } else if (vertexCount !== attribute.data.length / attribute.axis) {
        throw new Error('Vertex count mismatch');
      }
      // Create attribute data
      if (attributes[i] == null) {
        attributes[i] = {
          axis: attribute.axis
        };
      } else {
        attributes[i].axis = Math.max(attributes[i].axis, attribute.axis);
      }
    }
    if (vertexCount === -1) {
      throw new Error('Geometry should have at least one attribute');
    }
    return vertexCount;
  });
  let vertexCount = vertexCounts.reduce((a, b) => a + b);
  // Then, calculate total indices count. We have to create 'linear' indices
  // if a geometry doesn't have indices.
  let useIndices = geometries.some(a => a.indices);
  let indicesCount = geometries.reduce((count, geometry, index) => {
    if (geometry.indices == null) {
      return count + vertexCounts[index];
    }
    return count + geometry.indices.length;
  }, 0);
  // Pre-calculation is complete, populate actual data (per attribute)
  for (let key in attributes) {
    // TODO Support other than Float32Array
    let attribute = attributes[key];
    attribute.data = new Float32Array(vertexCount * attribute.axis);
    // Actually populate data
    let offset = 0;
    geometries.forEach((geometry, i) => {
      if (geometry.attributes[key]) {
        let geomAttribute = geometry.attributes[key];
        // Copy the whole data upon it (if axis matches)
        if (attribute.axis === geomAttribute.axis) {
          attribute.data.set(geomAttribute.data, offset);
        } else {
          // Otherwise, we have to copy it by one by one
          for (let j = 0; j < vertexCounts[i]; ++j) {
            let subset = geomAttribute.data.subarray(j, j + geomAttribute.axis);
            attribute.data.set(subset, offset + j * attribute.axis);
          }
        }
      }
      offset += vertexCounts[i] * attribute.axis;
    });
  }
  let indices;
  // Now, populate the indices
  if (useIndices) {
    indices = createIndicesArray(vertexCount, indicesCount);
    let indicesOffset = 0;
    let verticesOffset = 0;
    geometries.forEach((geometry, i) => {
      if (geometry.indices) {
        for (let j = 0; j < geometry.indices.length; ++j) {
          indices[indicesOffset + j] = geometry.indices[j] + verticesOffset;
        }
      } else {
        for (let j = 0; j < vertexCounts[i]; ++j) {
          indices[indicesOffset + j] = j + verticesOffset;
        }
      }
      indicesOffset += geometry.indices ?
        geometry.indices.length : vertexCounts[i];
      verticesOffset += vertexCounts[i];
    });
  }
  return {
    mode, attributes, indices
  };
}
