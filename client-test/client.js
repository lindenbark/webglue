import Shader from 'webglue/shader';
import Material from 'webglue/material';
import WireframeGeometry from 'webglue/wireframeGeometry';
import Mesh from 'webglue/mesh';
import CanvasRenderContext from './canvasRenderContext';
import Grid from './grid';
import widgetScene from './scene/normalMap';
import BlenderCameraController from './blenderCameraController';

import PointGeometry from './pointGeometry';
import { TranslateWidget } from './widget';

import { quat, vec3, mat4 } from 'gl-matrix';
import { TRANSLATE_AXIS_GEOM as spearGeom } from './widget';
import geometryRayIntersection from './util/geometryRayIntersection';

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';

const { container, camera, update: sceneUpdate } = widgetScene();

let grid = new Grid();
container.appendChild(grid);

quat.rotateX(grid.transform.rotation, grid.transform.rotation, Math.PI / 2);
grid.transform.invalidate();

let pointGeom = new PointGeometry();
let anchorShader = new Shader(
  require('./shader/anchorPoint.vert'), require('./shader/anchorPoint.frag')
);
let anchorMat = new Material(anchorShader);
anchorMat.use = () => ({
  uCross: new Float32Array([0, 0, 0]),
  uBorder1: new Float32Array([1, 0, 0]),
  uBorder2: new Float32Array([1, 1, 1]),
  uCrossWidth: 1/40,
  uCrossSize: 40,
  uCrossStart: 10/40,
  uRadius: 20/40,
  uBorderWidth: 1/40
});
let anchor = new Mesh(pointGeom, anchorMat);
container.appendChild(anchor);

let translateWidget = new TranslateWidget();
container.appendChild(translateWidget);

let controller = new BlenderCameraController(window, camera);
controller.registerEvents();

let context = new CanvasRenderContext();
context.camera = camera;

let spearList = [];

context.canvas.addEventListener('click', e => {
  if (e.button !== 0) return;
  const canvas = context.canvas;
  // Convert mouse position to NDC
  let x = (e.clientX - canvas.width / 2) / (canvas.width / 2);
  let y = -(e.clientY - canvas.height / 2) / (canvas.height / 2);

  function calcWorld(ndc) {
    // Invert projection matrix
    let projInverse = mat4.create();
    mat4.invert(projInverse, camera.projectMatrix);

    let viewPos = vec3.create();
    vec3.transformMat4(viewPos, ndc, projInverse);

    // Apply inverse view matrix
    let worldPos = vec3.create();
    vec3.transformMat4(worldPos, viewPos, camera.globalMatrix);
    return worldPos;
  }

  let far = calcWorld(vec3.fromValues(x, y, 1.0));
  let near = calcWorld(vec3.fromValues(x, y, -1.0));

  let diff = vec3.create();
  vec3.subtract(diff, far, near);
  vec3.normalize(diff, diff);

  let minMesh = null;
  let minFace = null;
  let minDist = Infinity;

  // Perform ray cast to all the meshes
  container.children.forEach(child => {
    if (!(child instanceof Mesh)) return;
    // Global matrix must be updated prior to the collision event
    let collision = geometryRayIntersection(child.geometry, child.globalMatrix,
      near, diff);
    if (collision === null) return;
    if (minDist > collision.distance) {
      minMesh = child;
      minFace = collision.faceId;
      minDist = collision.distance;
    }
  });

  // Now what?
  console.log(minMesh, minFace, minDist);

  // Create line
  let mesh = new Mesh(spearGeom, wireMaterial);
  container.appendChild(mesh);

  vec3.copy(mesh.transform.position, near);
  quat.rotationTo(mesh.transform.rotation, [1, 0, 0], diff);
  mesh.transform.scale[0] = 1;
  mesh.transform.invalidate();
  mesh.direction = diff;
  if (minDist !== Infinity) {
    mesh.distance = minDist - 1;
    mesh.despawn = false;
  } else {
    mesh.distance = 20;
    mesh.despawn = true;
  }
  mesh.count = 0;

  spearList.push(mesh);

  if (minDist !== Infinity) {
    vec3.copy(anchor.transform.position, near);
    let delta = vec3.create();
    vec3.copy(delta, diff);
    vec3.scale(delta, diff, minDist);
    vec3.add(anchor.transform.position, anchor.transform.position, delta);
    anchor.transform.invalidate();
  } else {
    // Calculate depth of anchor projected to the camera.
    let original = vec3.create();
    vec3.transformMat4(original, anchor.transform.position, camera.pvMatrix);
    let out = calcWorld(vec3.fromValues(x, y, original[2]));
    vec3.copy(anchor.transform.position, out);
    anchor.transform.invalidate();
  }

  if (minMesh) {
    vec3.copy(translateWidget.transform.position, minMesh.transform.position);
    translateWidget.transform.invalidate();
  }
});

let beforeTime;

let metrics = document.createElement('div');
metrics.style.position = 'absolute';
metrics.style.top = 0;
metrics.style.left = 0;
metrics.style.whiteSpace = 'pre';
metrics.style.background = '#fff';
document.body.appendChild(metrics);

let fpsCurrent = 0;
let fpsTotal = 0;
let fpsCount = 0;

function animate(currentTime) {
  if (beforeTime == null) beforeTime = currentTime;
  let delta = (currentTime - beforeTime) / 1000;
  for (let i = 0; i < spearList.length; ++i) {
    let spear = spearList[i];
    if (spear.count > spear.distance) continue;
    let dir = vec3.create();
    vec3.scale(dir, spear.direction, delta * 8);
    vec3.add(spear.transform.position, spear.transform.position, dir);
    spear.transform.invalidate();
    spear.count += delta * 8;
    if (spear.count > spear.distance) {
      spearList.splice(i, 1);
      i --;
      if (spear.despawn) {
        container.removeChild(spear);
      }
    }
  }
  sceneUpdate(delta);
  controller.update(delta);
  context.update(container, delta);
  fpsTotal += 1000 / (currentTime - beforeTime);
  fpsCount ++;
  beforeTime = currentTime;
  if (fpsCount > 30) {
    fpsCurrent = fpsTotal / fpsCount;
    fpsCount = 0;
    fpsTotal = 0;
  }
  let metricData = '';
  metricData += 'webglue v0.1.0\n';
  metricData += 'FPS: ' + fpsCurrent.toFixed(2) + '\n';
  for (let key in context.metrics) {
    metricData += key + ': ' + context.metrics[key] + '\n';
  }
  metrics.innerHTML = metricData;
  window.requestAnimationFrame(animate);
}
window.requestAnimationFrame(animate);

let wireShader = new Shader(
  require('./shader/wireframe.vert'), require('./shader/wireframe.frag')
);

let wireMaterial = new Material(wireShader);
wireMaterial.use = () => ({
  uColor: new Float32Array([0, 0, 0])
});

const wireGeometries = {};

let inWireframe = false;

window.addEventListener('keydown', (e) => {
  if (e.keyCode === 71) {
    grid.visible = !grid.visible;
  }
  if (e.keyCode === 90) {
    // Iterate through all childrens in the container
    container.children.forEach(child => {
      if (!(child instanceof Mesh)) return;
      if (inWireframe) {
        if (child.origMaterial && child.origGeometry) {
          child.material = child.origMaterial;
          child.geometry = child.origGeometry;
        }
      } else {
        if (child.geometry.type === 'points') return;
        if (child.geometry.type === 'lines') return;
        child.origMaterial = child.material;
        child.material = wireMaterial;
        child.origGeometry = child.geometry;
        if (wireGeometries[child.geometry.name] == null) {
          wireGeometries[child.geometry.name] =
            new WireframeGeometry(child.geometry);
        }
        child.geometry = wireGeometries[child.geometry.name];
      }
    });
    inWireframe = !inWireframe;
  }
});
