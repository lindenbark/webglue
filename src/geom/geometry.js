export default class Geometry {
  constructor(name) {
    this.type = 'triangles';
    this.cullFace = 'back';
    this.name = name || Symbol('geometry_' + (Math.random() * 1000 | 0));
  }
  getVertexCount() {
    return 0;
  }
  getAttributes() {
    return {};
  }
  getIndices() {
    return null;
  }
}
