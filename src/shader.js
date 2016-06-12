let ID = 0;

export default class Shader {
  constructor(vertex, fragment, name) {
    this.vertex = vertex;
    this.fragment = fragment;
    this.name = name || Symbol('shader_' + (Math.random() * 1000 | 0));
    // ....
    this.numberId = ID ++;
  }
  getVertexShader() {
    return this.vertex;
  }
  getFragmentShader() {
    return this.fragment;
  }
}
