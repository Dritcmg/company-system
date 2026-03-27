// ═══════════════════════════════════════════
//  PS1 POST-PROCESSING — Dithering + Low-Res
//  v2: Higher resolution (640x480), subtler effects
// ═══════════════════════════════════════════

import * as THREE from 'three';

const PS1_WIDTH = 640;
const PS1_HEIGHT = 480;

// Full-screen quad vertex shader
const quadVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Subtler dithering + color reduction
const ditherFrag = `
  uniform sampler2D tDiffuse;
  uniform vec2 u_resolution;
  uniform float u_ditherStrength;
  uniform float u_colorDepth;
  uniform float u_scanlineIntensity;
  
  varying vec2 vUv;
  
  // 4x4 Bayer matrix for ordered dithering
  float bayerMatrix(vec2 pos) {
    int x = int(mod(pos.x, 4.0));
    int y = int(mod(pos.y, 4.0));
    int val;
    if (y == 0) {
      if (x == 0) val = 0; else if (x == 1) val = 8; else if (x == 2) val = 2; else val = 10;
    } else if (y == 1) {
      if (x == 0) val = 12; else if (x == 1) val = 4; else if (x == 2) val = 14; else val = 6;
    } else if (y == 2) {
      if (x == 0) val = 3; else if (x == 1) val = 11; else if (x == 2) val = 1; else val = 9;
    } else {
      if (x == 0) val = 15; else if (x == 1) val = 7; else if (x == 2) val = 13; else val = 5;
    }
    return float(val) / 16.0 - 0.5;
  }
  
  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    
    // Subtle Bayer dithering
    vec2 pixelPos = vUv * u_resolution;
    float dither = bayerMatrix(pixelPos) * u_ditherStrength;
    color += dither;
    
    // Color depth (higher = more colors = subtler)
    float depth = u_colorDepth;
    color = floor(color * depth + 0.5) / depth;
    
    // Very subtle scanlines
    if (u_scanlineIntensity > 0.0) {
      float scanline = sin(pixelPos.y * 3.14159) * 0.5 + 0.5;
      color *= 1.0 - u_scanlineIntensity * (1.0 - scanline);
    }
    
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * PS1 Post-Processing Pipeline (v2 — subtler)
 */
export class PS1PostProcess {
  constructor(renderer) {
    this.renderer = renderer;
    
    // Higher resolution render target (readable text)
    this.renderTarget = new THREE.WebGLRenderTarget(PS1_WIDTH, PS1_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    
    this.ditherMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        u_resolution: { value: new THREE.Vector2(PS1_WIDTH, PS1_HEIGHT) },
        u_ditherStrength: { value: 0.025 },        // Very subtle
        u_colorDepth: { value: 32.0 },              // More colors
        u_scanlineIntensity: { value: 0.015 },      // Barely visible
      },
      vertexShader: quadVert,
      fragmentShader: ditherFrag,
      depthWrite: false,
      depthTest: false,
    });
    
    this.quad = new THREE.Mesh(this.quadGeometry, this.ditherMaterial);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  
  render(scene, camera) {
    const renderer = this.renderer;
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }
  
  onResize(width, height) {
    // Render target stays at fixed PS1 resolution
  }
  
  dispose() {
    this.renderTarget.dispose();
    this.ditherMaterial.dispose();
    this.quadGeometry.dispose();
  }
}
