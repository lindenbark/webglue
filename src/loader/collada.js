import sax from 'sax';

class Context {
  constructor() {
    this.stack = [];
    this.namespace = {};
  }
  push(operator, data) {
    let stackFrame = { operator, parent: this.stack[this.stack.length - 1] };
    this.stack.push(stackFrame);
    if (operator.push != null) operator.push.call(this, data, stackFrame);
  }
  pop(data) {
    if (this.stack.length === 0) throw new Error('Unable to pop frame');
    let stackFrame = this.stack.pop();
    let popOp = stackFrame.operator.pop;
    let result = popOp && popOp.call(this, data, stackFrame);
    if (this.stack.length > 0) {
      let parentFrame = this.stack[this.stack.length - 1];
      let popChild = parentFrame.operator.popChild;
      popChild && popChild.call(this, result, parentFrame);
    }
  }
  get() {
    return this.stack[this.stack.length - 1];
  }
  getDelegator(getOp) {
    return (v) => {
      let frame = this.get();
      let func = getOp(frame.operator);
      if (func != null) func.call(this, v, frame);
    };
  }
}

const NOOP = {
  opentag(node) {
    this.push(NOOP, node);
  },
  closetag() {
    this.pop();
  },
};

function resolveSchema(schema) {
  if (typeof schema === 'string') return SCHEMA[schema];
  if (typeof schema === 'function') return schema();
  return schema;
}

function cached(schema, manipulator) {
  // We use cache to make hoisting available.... what?
  let cached = null;
  return () => {
    if (cached !== null) return cached;
    cached = manipulator(resolveSchema(schema));
    return cached;
  };
}

const rename =
  (target, schema) => cached(schema, v => v && Object.assign({ target }, v));
const multiple =
  (schema) => cached(schema, v => v && Object.assign({
    // merge is *always* executed by hierarchy, even though no prev object
    // is available.
    merge: (prev = [], current) => (prev.push(current), prev)
  }, v));

function registerNamespace(node, frame) {
  Object.assign(frame.data, node.attributes);
  const { id } = node.attributes;
  if (id != null) {
    this.namespace[id] = frame.data;
  }
  frame.namespace = {};
}

function registerSid(node, frame) {
  Object.assign(frame.data, node.attributes);
  const { id, sid } = node.attributes;
  if (sid != null) {
    let node = frame.parent;
    while (node != null && node.namespace == null) {
      node = node.parent;
    }
    if (node != null) node.namespace[sid] = frame.data;
  } else {
    throw new Error('sid is required but was not specified');
  }
  if (id != null) {
    this.namespace[id] = frame.data;
  }
}

function hoist(children, triggers) {
  let onPush, onPop;
  if (typeof triggers === 'function') onPush = triggers;
  else if (triggers != null) {
    onPush = triggers.push;
    onPop = triggers.pop;
  }
  return {
    push(node, frame) {
      frame.data = {};
      if (onPush != null) onPush.call(this, node, frame);
    },
    opentag(node) {
      let child = children[node.name];
      // Ignore if node name doesn't match
      if (child == null) return this.push(NOOP, node);
      let schema = resolveSchema(child);
      // TODO Remove this
      if (schema == null) return this.push(NOOP, node);
      this.push(schema, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      if (onPop != null) return onPop.call(this, data, frame);
      return frame.data;
    },
    popChild(data, frame) {
      let result = data;
      frame.data = result;
    }
  };
}

function hierarchy(children, triggers) {
  let onPush, onPop;
  if (typeof triggers === 'function') onPush = triggers;
  else if (triggers != null) {
    onPush = triggers.push;
    onPop = triggers.pop;
  }
  return {
    push(node, frame) {
      // TODO attributes
      frame.data = {};
      if (onPush != null) onPush.call(this, node, frame);
    },
    opentag(node, frame) {
      let child = children[node.name];
      frame.target = null;
      // Ignore if node name doesn't match
      if (child == null) return this.push(NOOP, node);
      let schema = resolveSchema(child);
      // TODO Remove this
      if (schema == null) return this.push(NOOP, node);
      frame.target = schema.target || node.name;
      frame.targetSchema = schema;
      this.push(schema, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      console.log(frame.data);
      if (onPop != null) return onPop.call(this, data, frame);
      return frame.data;
    },
    popChild(data, frame) {
      let prev = frame.data[frame.target];
      let result = data;
      if (frame.target == null) return;
      if (frame.targetSchema && frame.targetSchema.merge != null) {
        result = frame.targetSchema.merge(prev, result);
      }
      frame.data[frame.target] = result;
    }
  };
}

function library(nodeName, schema) {
  return {
    push(node, frame) {
      frame.data = [];
    },
    opentag(node) {
      // TODO Maybe we should handle this?
      if (nodeName !== node.name) return this.push(NOOP, node);
      let schemaResolved = resolveSchema(schema);
      if (schemaResolved == null) return this.push(NOOP, node);
      this.push(schemaResolved, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      return frame.data;
    },
    popChild(data, frame) {
      if (data == null) return;
      frame.data.push(data);
    },
    merge(prev = [], current) {
      return prev.concat(current);
    }
  };
}

function attributes(proc) {
  return {
    push(node, frame) {
      if (proc != null) frame.data = proc(node);
      else frame.data = node.attributes;
    },
    opentag(node) {
      return this.push(NOOP, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    pop(data, frame) {
      return frame.data;
    },
    merge(prev = {}, current) {
      if (proc != null) return current;
      return Object.assign(prev, current);
    }
  };
}

function textValue(proc) {
  return {
    push(data, frame) {
      frame.value = null;
    },
    opentag(node) {
      return this.push(NOOP, node);
    },
    closetag() {
      // TODO This should be default operation if not specified
      this.pop();
    },
    text(data, frame) {
      let value = data.trim();
      if (value === '') return;
      frame.value = value;
    },
    pop(data, frame) {
      return proc(frame.value);
    }
  };
}

const MATERIAL_STRUCTURE = {
  emission: 'colorOrTexture',
  ambient: 'colorOrTexture',
  diffuse: 'colorOrTexture',
  specular: 'colorOrTexture',
  shininess: 'floatOrParam',
  reflective: 'colorOrTexture',
  reflectivity: 'floatOrParam',
  transparent: 'colorOrTexture',
  transparency: 'floatOrParam',
  index_of_refraction: rename('refraction', 'floatOrParam')
};

const SCHEMA = {
  noop: NOOP,
  attributes: attributes(),
  boolean: textValue(v => v === 'true'),
  string: textValue(v => v),
  // Should be the date parsed?
  date: textValue(v => v),
  stringArray: textValue(v => v.split(/\s+/)),
  float: textValue(v => parseFloat(v)),
  floatArray: textValue(v => new Float32Array(v.split(/\s+/).map(parseFloat))),
  COLLADA: hierarchy({
    asset: 'asset',
    library_animations: rename('animations', library('animation', 'animation')),
    library_animation_clips: rename('animationClips', library('animation_clip',
      'animationClip')),
    library_cameras: rename('cameras', library('camera', 'camera')),
    library_controllers: rename('controllers', library('controller',
      'controller')),
    library_geometries: rename('geometries', library('geometry', 'geometry')),
    library_lights: rename('lights', library('light', 'light')),
    library_nodes: rename('nodes', library('node', 'node')),
    library_visual_scenes: rename('visualScenes', library('visual_scene',
      'visualScene')),
    // COLLADA FX
    library_images: rename('images', library('image', 'image')),
    library_effects: rename('effects', library('effect', 'effect')),
    library_materials: rename('materials', library('material', 'material'))
  }, ({ attributes }) => {
    // Check version
    if (attributes.version.slice(0, 3) !== '1.4') {
      throw new Error('COLLADA parser only supports 1.4.x format');
    }
  }),
  asset: hierarchy({
    contributor: multiple('contributor'),
    created: 'date',
    modified: 'date',
    keywords: 'stringArray',
    revision: 'string',
    subject: 'string',
    title: 'string',
    unit: 'attributes',
    up_axis: rename('upAxis', 'string')
  }),
  contributor: hierarchy({
    author: 'string',
    authoring_tool: 'string',
    comments: 'string',
    copyright: 'string',
    source_data: rename('sourceData', 'string')
  }),
  animation: hierarchy({
    animation: rename('children', multiple('animation'))
  }, registerNamespace),
  effect: hierarchy({
    asset: 'asset',
    image: rename('images', multiple('image')),
    // Only accept COMMON profile for now
    profile_COMMON: rename('common', hierarchy({
      asset: 'asset',
      image: rename('images', multiple('image')),
      newparam: rename('params', multiple('newparam')),
      technique: hoist({
        // TODO Accept image / newparam at this point
        // image: rename('images', multiple('image')),
        // newparam: rename('params', multiple('newparam')),
        blinn: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'blinn'),
        constant: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'constant'),
        lambert: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'lambert'),
        phong: hierarchy(MATERIAL_STRUCTURE,
          (node, frame) => frame.data.type = 'phong')
      }, registerSid)
    }, registerNamespace))
  }, {
    push: registerNamespace,
    pop: (data, frame) => {
      if (frame.data.common) {
        let { common } = frame.data;
        let newImages = (frame.data.images || []).concat(common.images || []);
        Object.assign(frame.data, common);
        frame.data.images = newImages;
        delete frame.data.common;
        console.log(frame.data);
      }
      return frame.data;
    }
  }),
  newparam: hoist({
    float: 'float',
    float2: 'floatArray',
    float3: 'floatArray',
    float4: 'floatArray',
    surface: 'surface',
    sampler2D: 'sampler'
  }, registerSid),
  colorOrTexture: hoist({
    color: 'floatArray',
    param: attributes(v => v.attributes.ref),
    // Ignore 'texCoord' for now
    texture: attributes(v => v.attributes.texture)
  }),
  surface: hierarchy({
    size: 'floatArray',
    mipmap_generate: 'boolean',
    channels: 'string',
    range: 'string',
    // TODO Cube texture
    init_cube: NOOP,
    init_from: 'string'
  }),
  sampler: hierarchy({
    source: 'string',
    wrap_s: 'fxSamplerWrapCommon',
    wrap_t: 'fxSamplerWrapCommon',
    minfilter: 'fxSamplerFilterCommon',
    magfilter: 'fxSamplerFilterCommon',
    mipfilter: 'fxSamplerFilterCommon'
  })
};

const INITIAL = {
  opentag: function (node) {
    if (node.name !== 'COLLADA') {
      throw new Error('Provided file is not COLLADA format');
    }
    this.push(SCHEMA.COLLADA, node);
  }
};

export default function loadCollada(data) {
  let context = new Context();
  context.push(INITIAL);
  let parser = sax.parser(true);
  parser.onerror = (e) => console.log(e);
  parser.ontext = context.getDelegator(v => v.text);
  parser.onopentag = context.getDelegator(v => v.opentag);
  parser.onclosetag = context.getDelegator(v => v.closetag);
  parser.onattribute = context.getDelegator(v => v.attribute);
  parser.onend = context.getDelegator(v => v.end);
  parser.write(data).close();
}