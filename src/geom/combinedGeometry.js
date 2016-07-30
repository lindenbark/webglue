import Geometry from './geometry';
import createIndicesArray from '../util/createIndicesArray';

import { vec2, vec3, vec4 } from 'gl-matrix';

export default class CombinedGeometry extends Geometry {
  constructor(geometries, transforms, name) {
    super(name);
    this.type = [];
    // Attributes data can be stored linearly, without any sorting. However,
    // indices data must be sorted by types in order to reduce draw calls.

    // First, compute total vertices count of the geometries.
    // Compute the indices too.
    let verticesCount = geometries.reduce((before, geometry) =>
      before + geometry.getVertexCount()
    , 0);
    let indicesCount = geometries.reduce((before, geometry) =>
      before + geometry.getIndices().length
    , 0);
    this.verticesCount = verticesCount;
    // Then, create the indices - We must sort them in types to reduce
    // draw calls.
    this.indices = createIndicesArray(verticesCount, indicesCount);
    // Calculate total indices per type, this should be more efficient than
    // creating buffer for each type.
    let typeIndicesSize = {};
    for (let i = 0; i < geometries.length; ++i) {
      let geometry = geometries[i];
      if (Array.isArray(geometry.type)) {
        geometry.type.forEach(entry => {
          typeIndicesSize[entry.type] = (typeIndicesSize[entry.type] || 0) +
            entry.count;
        });
      } else {
        typeIndicesSize[geometry.type] = (typeIndicesSize[geometry.type] || 0) +
          geometry.indices.length;
      }
    }
    // Then, calculate each type's offset. (Order shouldn't really matter)
    let typeIndicesPos = {};
    let typeIndicesOffset = {};
    let indicesPos = 0;
    for (let key in typeIndicesSize) {
      typeIndicesPos[key] = indicesPos;
      typeIndicesOffset[key] = indicesPos;
      indicesPos += typeIndicesSize[key];
    }
    // Then, create attributes used by geometries. We have to handle axis
    // conflict and other stuff too.
    // If one geometry uses a attribute and others don't, other geometries
    // will be filled with 0 instead. (Default behavior of typed array)
    // Processing attributes after the indices can save one for loop
    // (it doesn't really matter though)
    this.attributes = {};
    let vertPos = 0;
    for (let i = 0; i < geometries.length; ++i) {
      let geometry = geometries[i];
      let transform = (transforms && transforms[i]) || {};
      // Calculate attributes
      let attribData = geometry.getAttributes();
      for (let key in transform) {
        if (attribData[key] == null) {
          // Dump constant data to the buffer...
          let axis = transform[key].length;
          let buffer;
          if (this.attributes[key] == null) {
            // Create buffer and put data
            // TODO support other than Float32Array
            buffer = new Float32Array(axis * verticesCount);
            // ....Then set the attributes.
            this.attributes[key] = {
              axis: axis,
              data: buffer
            };
          } else {
            // Do a simple type check
            let combinedData = this.attributes[key];
            if (combinedData.axis !== axis) {
              throw new Error('Vertices data axis mismatch');
            }
            buffer = combinedData.data;
            // If everything is okay, continue and put the data.
          }
          let size = geometry.getVertexCount();
          for (let i = 0; i < size; ++i) {
            buffer.set(transform[key], axis * (vertPos + i));
          }
        }
      }
      for (let key in attribData) {
        let data = attribData[key];
        let buffer;
        if (this.attributes[key] == null) {
          // Create buffer and put data
          // TODO support other than Float32Array
          buffer = new Float32Array(data.axis * verticesCount);
          // ....Then set the attributes.
          this.attributes[key] = {
            axis: data.axis,
            data: buffer
          };
        } else {
          // Do a simple type check
          let combinedData = this.attributes[key];
          if (combinedData.data.constructor !== data.data.constructor) {
            throw new Error('Vertices data type mismatch');
          }
          if (combinedData.axis !== data.axis) {
            throw new Error('Vertices data axis mismatch');
          }
          buffer = combinedData.data;
          // If everything is okay, continue and put the data.
        }
        // Overwrite buffer data. However, if transform is enabled, we have
        // to set them one by one.
        if (transform && transform[key]) {
          let size = geometry.getVertexCount();
          let attribTransform = transform[key];
          for (let i = 0; i < size; ++i) {
            let original = data.data.slice(data.axis * i,
              data.axis * i + data.axis);
            if (attribTransform instanceof Float32Array ||
              Array.isArray(attribTransform)
            ) {
              if (attribTransform.length === data.axis) {
                // Constant transform
                original = attribTransform;
              } else if (data.axis === 4 && attribTransform.length === 16) {
                // Matrix transform (4D, 4x4)
                vec4.transformMat4(original, original, attribTransform);
              } else if (data.axis === 3 && attribTransform.length === 16) {
                // Matrix transform (3D, 4x4)
                vec3.transformMat4(original, original, attribTransform);
              } else if (data.axis === 3 && attribTransform.length === 9) {
                // Matrix transform (3D, 3x3)
                vec3.transformMat3(original, original, attribTransform);
              } else if (data.axis === 2 && attribTransform.length === 9) {
                // Matrix transform (2D, 3x3)
                vec2.transformMat3(original, original, attribTransform);
              } else if (data.axis === 2 && attribTransform.length === 6) {
                // Matrix transform (2D, 2x3)
                vec2.transformMat2d(original, original, attribTransform);
              } else if (data.axis === 2 && attribTransform.length === 4) {
                // Matrix transform (2D, 2x2)
                vec2.transformMat2(original, original, attribTransform);
              } else {
                // Unsupported
                throw new Error('Unsupported array transform type');
              }
            } else if (typeof attribTransform === 'function') {
              // Run the function.
              original = attribTransform(original, i);
            } else {
              // Unsupported. what?
              throw new Error('Unsupported transform type');
            }
            buffer.set(original, data.axis * (vertPos + i));
          }
        } else {
          buffer.set(data.data, data.axis * vertPos);
        }
      }
      let types = geometry.type;
      if (!Array.isArray(geometry.type)) {
        types = [{
          type: geometry.type,
          first: 0,
          count: geometry.indices.length
        }];
      }
      let geomIndices = geometry.getIndices();
      types.forEach(entry => {
        // Calculate indices. In order to add vertex position to the indices,
        // we have to process one index at a time.
        let indicesPos = typeIndicesPos[entry.type];
        for (let j = 0; j < entry.count; ++j) {
          this.indices[indicesPos + j] =
            geomIndices[j + entry.first] + vertPos;
        }
        // Finally, increment the pointer.
        typeIndicesPos[entry.type] += entry.count;
      });
      vertPos += geometry.getVertexCount();
    }
    // ... Set the type.
    this.type = [];
    for (let key in typeIndicesSize) {
      this.type.push({
        first: typeIndicesOffset[key],
        count: typeIndicesSize[key],
        type: key
      });
    }
  }
  getVertexCount() {
    return this.verticesCount;
  }
  getIndices() {
    return this.indices;
  }
  getAttributes() {
    return this.attributes;
  }
}
