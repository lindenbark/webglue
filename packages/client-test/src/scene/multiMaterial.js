import loadOBJ from 'webglue/lib/loader/obj';
import loadMTL from 'webglue/lib/loader/mtl';
import channelGeom from 'webglue/lib/geom/channel';
import boxGeom from 'webglue/lib/geom/box';
import bakeMesh from 'webglue/lib/util/bakeMesh';

import { mat3, mat4 } from 'gl-matrix';

export default function multiMaterial(renderer) {
  const gl = renderer.gl;
  let box = renderer.geometries.create(boxGeom());
  let skybox = renderer.textures.create([
    require('../texture/stormyday/front.jpg'),
    require('../texture/stormyday/back.jpg'),
    require('../texture/stormyday/down.jpg'),
    require('../texture/stormyday/up.jpg'),
    require('../texture/stormyday/right.jpg'),
    require('../texture/stormyday/left.jpg')
  ]);
  let skyboxShader = renderer.shaders.create(
    require('../shader/skybox.vert'),
    require('../shader/skybox.frag')
  );
  // 1. Create Geometry, then bake ChannelGeometry to WebglueGeometry
  let geometry = renderer.geometries.create(channelGeom(
    loadOBJ(require('../geom/pencil.obj'), true, true)
  ));
  // 2. Load material data
  let materials = loadMTL(require('../geom/pencil.mtl'));
  // 3. Prepare Phong shader
  let shader = renderer.shaders.create(
    require('../shader/phong.vert'),
    require('../shader/phong.frag')
  );
  // 4. Bake Material to WebglueRenderNode
  function bakeMaterial(material) {
    return {
      shader,
      uniforms: {
        uMaterial: {
          ambient: material.ambient.map((v, i) => v * material.diffuse[i]),
          diffuse: material.diffuse,
          specular: material.specular,
          shininess: material.shininess,
          reflectivity: material.model === 3 ? new Float32Array([
            material.specular[0], material.specular[1], material.specular[2], 1
          ]) : '#00000000'
        }
      }
    };
  }
  let bakedMaterials = {};
  for (let key in materials) {
    bakedMaterials[key] = bakeMaterial(materials[key]);
  }
  // 5. Bake Material, Geometry to WebglueRenderNode
  let nodes = bakeMesh(geometry, bakedMaterials);
  // Done
  let model1Mat = mat4.create();
  let model1Normal = mat3.create();
  return (delta, context) => {
    renderer.render({
      options: {
        clearColor: new Float32Array([0, 0, 0, 1]),
        clearDepth: 1,
        cull: gl.BACK,
        depth: gl.LEQUAL
      },
      uniforms: Object.assign({}, context.camera, {
        uPointLight: [{
          position: [0, 1, 1],
          color: '#ffffff',
          intensity: [0.3, 0.8, 1.0, 0.00015]
        }]
      }),
      passes: [{
        shader: shader,
        uniforms: {
          uModel: model1Mat,
          uNormal: model1Normal,
          uHeightMapScale: [0.2, 1.1],
          uEnvironmentMap: skybox
          // uHeightMap: heightMap,
          // uDiffuseMap: texture
        },
        passes: nodes
      }, {
        shader: skyboxShader,
        geometry: box,
        options: {
          cull: gl.FRONT
        },
        uniforms: {
          uSkybox: skybox
        }
      }]
    });
  };
}
