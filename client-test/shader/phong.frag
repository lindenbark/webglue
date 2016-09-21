#version 100
#pragma webglue: feature(USE_ENVIRONMENT_MAP, uEnvironmentMap)
#pragma webglue: feature(USE_DIFFUSE_MAP, uDiffuseMap)
#pragma webglue: feature(USE_NORMAL_MAP, uNormalMap)
#pragma webglue: count(POINT_LIGHT_SIZE, uPointLight, max)

#if defined(USE_NORMAL_MAP) || defined(USE_HEIGHT_MAP)
  #define USE_TANGENT_SPACE
#endif

#ifndef POINT_LIGHT_SIZE
#define POINT_LIGHT_SIZE 1
#endif

precision lowp float;

varying lowp vec3 vPosition;
varying lowp vec3 vNormal;
varying lowp vec2 vTexCoord;
varying lowp vec3 vViewPos;

struct Material {
  lowp vec3 ambient;
  lowp vec3 diffuse;
  lowp vec3 specular;

  #ifdef USE_ENVIRONMENT_MAP
    lowp vec4 reflectivity;
  #endif
  lowp float shininess;
};

struct MaterialColor {
  lowp vec3 ambient;
  lowp vec3 diffuse;
  lowp vec3 specular;
};

struct PointLight {
  lowp vec3 position;

  lowp vec3 color;
  lowp vec4 intensity;
};

#if POINT_LIGHT_SIZE > 0
uniform PointLight uPointLight[POINT_LIGHT_SIZE];
#endif
uniform Material uMaterial;

uniform lowp vec3 uTint;
uniform sampler2D uDiffuseMap;
uniform samplerCube uEnvironmentMap;

// It's Blinn-Phong actually.
lowp vec3 calcPhong(lowp vec3 lightDir, lowp vec3 viewDir, lowp vec3 normal) {
  // Diffuse
  lowp float lambertian = max(dot(lightDir, normal), 0.0);

  // Specular
  lowp float spec = 0.0;
  lowp float fresnel = 0.0;
  if (lambertian > 0.0) {
    lowp vec3 halfDir = normalize(lightDir + viewDir);
    lowp float specAngle = max(dot(halfDir, normal), 0.0);

    spec = pow(specAngle, uMaterial.shininess);
    fresnel = pow(1.0 - max(0.0, dot(halfDir, viewDir)), 5.0);
  }

  return vec3(lambertian, spec, fresnel);
}

lowp vec3 calcPoint(PointLight light, MaterialColor matColor, lowp vec3 viewDir,
  lowp vec3 normal
) {
  lowp vec3 lightDir = light.position - vPosition;

  lowp float distance = length(lightDir);
  lightDir = lightDir / distance;

  // Attenuation
  lowp float attenuation = 1.0 / ( 1.0 +
    light.intensity.w * (distance * distance));

  lowp vec3 phong = calcPhong(lightDir, viewDir, normal);

  // Combine everything together
  lowp vec3 result = matColor.diffuse * light.intensity.g * phong.x;
  result += mix(matColor.specular, vec3(1.0), phong.z) *
    light.intensity.b * phong.y;
  result += matColor.ambient * light.intensity.r;
  result *= attenuation;
  result *= light.color;

  return result;
}

void main(void) {
  lowp vec3 viewDir = normalize(vViewPos - vPosition);
  lowp vec3 normal = normalize(vNormal);
  lowp vec2 texCoord = vTexCoord;
  MaterialColor matColor;
  matColor.ambient = uMaterial.ambient;
  matColor.diffuse = uMaterial.diffuse;
  matColor.specular = uMaterial.specular;

  #ifdef USE_DIFFUSE_MAP
  lowp vec4 diffuseTex = vec4(texture2D(uDiffuseMap, vTexCoord).xyz + uTint, 1.0);
  matColor.ambient *= diffuseTex.xyz;
  matColor.diffuse *= diffuseTex.xyz;
  #endif

  #ifdef USE_ENVIRONMENT_MAP
  lowp vec3 result = vec3(0.0, 0.0, 0.0);
	// TODO Support matte PBR (Disabled for now due to
	// https://github.com/KhronosGroup/WebGL/issues/1528)
	lowp vec4 environmentTex = vec4(0.0);
	if (uMaterial.reflectivity.w > 0.5) {
	  lowp vec3 outVec = reflect(viewDir, normalize(vNormal));
	  environmentTex = vec4(textureCube(uEnvironmentMap, outVec).xyz, 1.0);
	} else {
		// Fallback: Sample random direction (to match colors)
	  environmentTex = vec4(textureCube(uEnvironmentMap, vec3(0.0, 0.0, 1.0)).xyz, 1.0);
	}
  lowp float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 5.0);
	result = environmentTex.xyz *
  mix(uMaterial.reflectivity.xyz, vec3(uMaterial.reflectivity.w), fresnel);
  lowp float power = mix(1.0, 1.0 - uMaterial.reflectivity.w, fresnel);
  matColor.ambient *= power;
  matColor.diffuse *= power;
  #else
  lowp vec3 result = vec3(0.0, 0.0, 0.0);
  #endif
	#if POINT_LIGHT_SIZE > 0
  for (int i = 0; i < POINT_LIGHT_SIZE; ++i) {
    result += calcPoint(uPointLight[i], matColor, viewDir, normal);
  }
	#endif

  gl_FragColor = vec4(result, 1.0);

}
