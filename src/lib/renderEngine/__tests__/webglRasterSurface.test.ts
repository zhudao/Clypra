import { describe, expect, it, vi } from 'vitest';
import { WebGLRasterSurface } from '../webglRasterSurface';
import type { TransportArtifact } from '../transport';
import type { RenderEpochId } from '../types';
import { SpatialTier } from '../types';

const eid = (s: string) => s as RenderEpochId;

function makeArtifact(timestampMs: number, width = 80, height = 45): TransportArtifact {
  return {
    frameId: `f-${timestampMs}`,
    contentHash: `h-${timestampMs}`,
    spatialTier: SpatialTier.L0,
    bitmap: { width, height, close: vi.fn() } as unknown as ImageBitmap,
    width,
    height,
    timestampMs,
    epochId: eid('epoch-1'),
    source: 'fresh-decode',
  };
}

function makeGl() {
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    COLOR_BUFFER_BIT: 0x4000,
    ARRAY_BUFFER: 0x8892,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    TEXTURE0: 0x84c0,
    TRIANGLES: 0x0004,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    getAttribLocation: vi.fn((_program: unknown, name: string) => {
      if (name === 'a_posRect') return 0;
      if (name === 'a_uvRect') return 1;
      return -1;
    }),
    createVertexArray: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    useProgram: vi.fn(),
    bindVertexArray: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1i: vi.fn(),
    activeTexture: vi.fn(),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteProgram: vi.fn(),
  };

  return gl as unknown as WebGL2RenderingContext;
}

describe('WebGLRasterSurface', () => {
  it('binds only live shader attributes during filmstrip draw', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const gl = makeGl();
    const surface = new WebGLRasterSurface(canvas, gl);

    surface.drawFilmstrip([makeArtifact(1000), makeArtifact(2000)], {
      clipWidthPx: 120,
      stripHeightPx: 40,
      dpr: 1,
      tileWidthPx: 60,
    });

    expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_posRect');
    expect(gl.getAttribLocation).toHaveBeenCalledWith(expect.anything(), 'a_uvRect');
    expect(gl.getAttribLocation).not.toHaveBeenCalledWith(expect.anything(), 'a_tileIdx');
    expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
    expect(gl.enableVertexAttribArray).not.toHaveBeenCalledWith(-1);
    expect(gl.vertexAttribPointer).not.toHaveBeenCalledWith(-1, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it('packs mixed-size artifacts into fixed atlas cells without overlap', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const gl = makeGl();
    const surface = new WebGLRasterSurface(canvas, gl);

    surface.drawFilmstrip([makeArtifact(1000, 80, 45), makeArtifact(2000, 120, 68)], {
      clipWidthPx: 120,
      stripHeightPx: 40,
      dpr: 1,
      tileWidthPx: 60,
    });

    expect(gl.texSubImage2D).toHaveBeenNthCalledWith(
      1,
      gl.TEXTURE_2D,
      0,
      0,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      expect.anything(),
    );
    expect(gl.texSubImage2D).toHaveBeenNthCalledWith(
      2,
      gl.TEXTURE_2D,
      0,
      120,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      expect.anything(),
    );
  });

  it('accepts portrait artifacts without stretching them to fill tile width', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const gl = makeGl();
    const surface = new WebGLRasterSurface(canvas, gl);

    surface.drawFilmstrip([makeArtifact(1000, 90, 160)], {
      clipWidthPx: 96,
      stripHeightPx: 40,
      dpr: 1,
      tileWidthPx: 96,
    });

    const vertices = vi.mocked(gl.bufferData).mock.calls[0][1] as Float32Array;

    // The portrait bitmap is centered and clipped vertically. Its destination
    // width remains 90px inside a 96px tile instead of being stretched to 96px.
    expect(vertices[0]).toBeCloseTo((3 / 96) * 2 - 1, 5);
    expect(vertices[2]).toBeCloseTo((90 / 96) * 2, 5);
    expect(vertices[6]).toBeCloseTo(90 / 128, 5);
    expect(vertices[7]).toBeCloseTo(40 / 256, 5);
  });
});
