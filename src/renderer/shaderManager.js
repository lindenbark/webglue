import PreprocessShader from './preprocessShader';
import Shader from './shader';
export default class ShaderManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.shaders = [];
    this.current = null;
    this.handler = null;
  }
  create(vert, frag, noPreprocess = false) {
    let shader;
    if (noPreprocess) {
      shader = new Shader(this.renderer, vert, frag);
    } else {
      shader = new PreprocessShader(this.renderer, vert, frag);
    }
    this.shaders.push(shader);
    return shader;
  }
  use(shader, uniforms) {
    let returned = shader.getShader(uniforms, this.current);
    if (this.handler != null) {
      returned = this.handler(returned, uniforms, this.renderer);
    }
    this.current = returned.use(uniforms, this.current);
  }
  reset() {
    this.current = null;
    this.shaders.forEach(shader => shader.dispose());
  }
}
