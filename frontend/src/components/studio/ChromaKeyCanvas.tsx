"use client";

import React, { useEffect, useRef } from "react";

interface ChromaKeyCanvasProps {
  videoElement: HTMLVideoElement | null;
  keyColor?: string; // Hex e.g. '#00b140'
  tolerance?: number; // 0.1 to 0.8
  smoothness?: number; // 0.0 to 0.4
  spill?: number; // 0.0 to 1.0
  className?: string;
  mirror?: boolean;
}

// Convert hex string "#RRGGBB" to normalized [r, g, b] (0.0 to 1.0)
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.0, 0.7, 0.25]; // Default vibrant green
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b];
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform vec3 u_keyColor;
  uniform float u_similarity;
  uniform float u_smoothness;
  uniform float u_spill;
  varying vec2 v_texCoord;

  // Broadcast-grade RGB to YCbCr color conversion
  vec3 rgb2ycbcr(vec3 c) {
    float y = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    float cb = -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b;
    float cr = 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b;
    return vec3(y, cb, cr);
  }

  void main() {
    vec4 pixel = texture2D(u_texture, v_texCoord);
    vec3 keyYCbCr = rgb2ycbcr(u_keyColor);
    vec3 pixYCbCr = rgb2ycbcr(pixel.rgb);

    // Distance in the chrominance Cb-Cr plane (insensitive to shadows/uneven lighting)
    float dist = distance(pixYCbCr.yz, keyYCbCr.yz);
    float edge0 = u_similarity;
    float edge1 = u_similarity + max(0.001, u_smoothness);
    float alpha = smoothstep(edge0, edge1, dist);

    // Spill suppression: removes green/blue bounce reflection on hair and shoulders
    if (alpha < 0.95) {
      float desat = pixel.g - max(pixel.r, pixel.b);
      if (desat > 0.0) {
        pixel.g -= desat * u_spill;
      }
    }

    gl_FragColor = vec4(pixel.rgb, pixel.a * alpha);
  }
`;

export const ChromaKeyCanvas: React.FC<ChromaKeyCanvasProps> = ({
  videoElement,
  keyColor = "#00b140",
  tolerance = 0.38,
  smoothness = 0.12,
  spill = 0.35,
  className,
  mirror = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL with transparent alpha channel
    const gl =
      canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) ||
      (canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false }) as WebGLRenderingContext | null);

    if (!gl) {
      console.warn("WebGL not supported for Chroma Key");
      return;
    }
    glRef.current = gl;

    // Helper to compile shader
    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("ChromaKey shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("ChromaKey program link error:", gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;
    gl.useProgram(program);

    // Full screen quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinates buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,
      ]),
      gl.STATIC_DRAW
    );

    const aTexCoord = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Create Video Texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (program) gl.deleteProgram(program);
      if (texture) gl.deleteTexture(texture);
    };
  }, []);

  // Update Uniforms and 60fps render loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !texture || !canvas) return;

    gl.useProgram(program);

    const uKeyColor = gl.getUniformLocation(program, "u_keyColor");
    const uSimilarity = gl.getUniformLocation(program, "u_similarity");
    const uSmoothness = gl.getUniformLocation(program, "u_smoothness");
    const uSpill = gl.getUniformLocation(program, "u_spill");

    const [r, g, b] = hexToRgb(keyColor);
    gl.uniform3f(uKeyColor, r, g, b);
    gl.uniform1f(uSimilarity, tolerance);
    gl.uniform1f(uSmoothness, smoothness);
    gl.uniform1f(uSpill, spill);

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      if (
        videoElement &&
        videoElement.readyState >= 2 &&
        videoElement.videoWidth > 0 &&
        videoElement.videoHeight > 0
      ) {
        if (
          canvas.width !== videoElement.videoWidth ||
          canvas.height !== videoElement.videoHeight
        ) {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          videoElement
        );

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [videoElement, keyColor, tolerance, smoothness, spill]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    />
  );
};
