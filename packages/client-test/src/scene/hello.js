import boxGeom from 'webglue/lib/geom/box';
import calcNormals from 'webglue/lib/geom/calcNormals';

import MeshTransform from 'webglue/lib/meshTransform';

export default function hello(renderer) {
  const gl = renderer.gl;
  let box = renderer.geometries.create(calcNormals(boxGeom()));
  let shader = renderer.shaders.create(
    require('../shader/phong.vert'),
    require('../shader/phong.frag')
  );
  let texture = renderer.textures.create(require('../texture/2.png'));

  let parent = new MeshTransform();
  let model = new MeshTransform();
  model.parent = parent;

  let timer = 0;
  return (delta, context) => {
    timer += delta;

    parent.rotateZ(delta * 2);
    model.rotateX(delta * 10);
    model.setPos([Math.sin(timer * 7) * 2 + 2, 0, 0]);

    renderer.render({
      options: {
        clearColor: new Float32Array([0, 0, 0, 1]),
        clearDepth: 1,
        cull: gl.BACK,
        depth: gl.LEQUAL
      },
      uniforms: Object.assign({}, context.camera, {
        uPointLight: [{
          position: [0, 0, 8],
          color: '#ffffff',
          intensity: [0.3, 0.7, 0.5, 0.00015]
        }]
      }),
      passes: [{
        shader: shader,
        geometry: box,
        uniforms: {
          uModel: model.get,
          uNormal: model.getNormal,
          uMaterial: {
            ambient: '#ffffff',
            diffuse: '#ffffff',
            specular: '#555555',
            shininess: 30
          },
          uDiffuseMap: texture
        }
      }]
    });
  };
}
