#version 100
precision lowp float;

varying lowp vec2 vTexCoord;

uniform sampler2D uTexture;
uniform sampler2D uDepthTexture;
uniform lowp vec2 uTextureOffset;
uniform lowp vec2 uRange;
uniform lowp vec2 uDirection;

float fragDepth;

float decodeDepth(vec2 v) {
  return dot(v, vec2(1.0, 1.0 / 255.0)) * uRange.y + uRange.x;
}

vec4 sampleTexture(vec2 uv) {
  vec4 sampleData = texture2D(uDepthTexture, uv);
  float sampleDepth = decodeDepth(sampleData.ba);
  return texture2D(uTexture, uv) * (fragDepth <= (sampleDepth + 0.05) ? 1.0 : 0.25);
}

/*
  From: https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/13.glsl

  The MIT License (MIT)
  Copyright (c) 2015 Jam3

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
  OR OTHER DEALINGS IN THE SOFTWARE.

*/
vec4 blur13(vec2 uv, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += sampleTexture(uv) * 0.1964825501511404;
  color += sampleTexture(uv + (off1 * uTextureOffset)) * 0.2969069646728344;
  color += sampleTexture(uv - (off1 * uTextureOffset)) * 0.2969069646728344;
  color += sampleTexture(uv + (off2 * uTextureOffset)) * 0.09447039785044732;
  color += sampleTexture(uv - (off2 * uTextureOffset)) * 0.09447039785044732;
  color += sampleTexture(uv + (off3 * uTextureOffset)) * 0.010381362401148057;
  color += sampleTexture(uv - (off3 * uTextureOffset)) * 0.010381362401148057;
  return color;
}

void main() {
  vec4 fragData = texture2D(uDepthTexture, vTexCoord);
  fragDepth = decodeDepth(fragData.ba);
  vec4 data = blur13(vTexCoord, uDirection);
  gl_FragColor = vec4(data.xyz / data.w, 1.0);
}
