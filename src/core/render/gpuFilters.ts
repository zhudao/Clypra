import { Filter, Texture } from "pixi.js";
import { AdjustmentFilter } from "pixi-filters";
import { createGPUBodyOutlineFilter, createGPUBodyGlowFilter, createGPUBodyParticlesFilter } from "@clypra-studio/engine";


// Standard vertex shader for PixiJS v8 filters
const VERTEX_SHADER = `
  in vec2 aPosition;
  out vec2 vTextureCoord;

  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
  }

  vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
  }

  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

/**
 * Creates a GPU-accelerated Pixelate Filter
 */
export function createGPUPixelateFilter(pixelSize: number): Filter {
  const fragmentShader = `
    precision mediump float;
    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;
    uniform float uPixelSize;
    uniform vec4 uInputSize;

    void main(void) {
      vec2 pixelSize = vec2(uPixelSize) * uInputSize.zw;
      vec2 coord = floor(vTextureCoord / pixelSize) * pixelSize + pixelSize * 0.5;
      fragColor = texture(uSampler, coord);
    }
  `;

  return Filter.from({
    gl: {
      vertex: VERTEX_SHADER,
      fragment: fragmentShader,
    },
    resources: {
      customUniforms: {
        uPixelSize: { value: pixelSize, type: "f32" },
      },
    },
  });
}

/**
 * Creates a GPU-accelerated Scanlines Filter
 */
export function createGPUScanlinesFilter(count: number, intensity: number): Filter {
  const fragmentShader = `
    precision mediump float;
    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;
    uniform float uCount;
    uniform float uIntensity;

    void main(void) {
      vec4 color = texture(uSampler, vTextureCoord);
      float scanline = sin(vTextureCoord.y * uCount * 3.14159) * 0.5 + 0.5;
      vec3 dark = color.rgb * (1.0 - uIntensity * 0.5);
      fragColor = vec4(mix(dark, color.rgb, scanline), color.a);
    }
  `;

  return Filter.from({
    gl: {
      vertex: VERTEX_SHADER,
      fragment: fragmentShader,
    },
    resources: {
      customUniforms: {
        uCount: { value: count, type: "f32" },
        uIntensity: { value: intensity, type: "f32" },
      },
    },
  });
}

/**
 * Creates a GPU-accelerated Chromatic Aberration (RGB Split) Filter
 */
export function createGPURGBSplitFilter(shiftX: number, shiftY: number, width: number, height: number): Filter {
  const fragmentShader = `
    precision mediump float;
    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;
    uniform vec2 uOffset;

    void main(void) {
      float r = texture(uSampler, vTextureCoord - uOffset).r;
      vec4 gAndB = texture(uSampler, vTextureCoord);
      float g = gAndB.g;
      float b = texture(uSampler, vTextureCoord + uOffset).b;
      fragColor = vec4(r, g, b, gAndB.a);
    }
  `;

  const offX = shiftX / width;
  const offY = shiftY / height;

  return Filter.from({
    gl: {
      vertex: VERTEX_SHADER,
      fragment: fragmentShader,
    },
    resources: {
      customUniforms: {
        uOffset: { value: [offX, offY], type: "vec2<f32>" },
      },
    },
  });
}

/**
 * Creates a GPU-accelerated Film Grain Filter
 */
export function createGPUFilmGrainFilter(intensity: number, time: number): Filter {
  const fragmentShader = `
    precision mediump float;
    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;
    uniform float uIntensity;
    uniform float uTime;

    float noise(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main(void) {
      vec4 color = texture(uSampler, vTextureCoord);
      float grain = (noise(vTextureCoord + uTime) - 0.5) * uIntensity;
      fragColor = vec4(color.rgb + vec3(grain), color.a);
    }
  `;

  return Filter.from({
    gl: {
      vertex: VERTEX_SHADER,
      fragment: fragmentShader,
    },
    resources: {
      customUniforms: {
        uIntensity: { value: intensity * 0.15, type: "f32" },
        uTime: { value: time, type: "f32" },
      },
    },
  });
}

/**
 * Creates a GPU-accelerated Vignette Filter
 */
export function createGPUVignetteFilter(radius: number, intensity: number): Filter {
  const fragmentShader = `
    precision mediump float;
    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;
    uniform float uRadius;
    uniform float uIntensity;

    void main(void) {
      vec4 color = texture(uSampler, vTextureCoord);
      vec2 uv = vTextureCoord - 0.5;
      float dist = length(uv);
      float vignette = smoothstep(uRadius, uRadius + 0.5, dist);
      fragColor = vec4(color.rgb * (1.0 - vignette * uIntensity), color.a);
    }
  `;

  return Filter.from({
    gl: {
      vertex: VERTEX_SHADER,
      fragment: fragmentShader,
    },
    resources: {
      customUniforms: {
        uRadius: { value: radius * 0.5, type: "f32" },
        uIntensity: { value: intensity, type: "f32" },
      },
    },
  });
}


