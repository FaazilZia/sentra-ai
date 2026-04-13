'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  className?: string;
}

/**
 * Aurora Component - Expert Production-Ready Version
 * High-performance WebGL background animation with SSR safety and responsive scaling.
 */
export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  console.log('Aurora Rendering, isMounted:', isMounted);

  useEffect(() => {
    console.log('Aurora Mounting Effect Triggered');
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    console.log('Aurora WebGL Effect Triggered');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Aurora Canvas Ref is NULL');
      return;
    }
    console.log('Aurora Canvas Ref Found, initializing WebGL');

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
          ]
        : [0, 0, 0];
    };

    const colors = colorStops.map(hexToRgb);

    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uAmplitude;
      uniform float uBlend;
      varying vec2 vUv;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 a0 = x - floor(x + 0.5);
        vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
        float n = 130.0 * dot(m, g);
        return n;
      }

      void main() {
        vec2 uv = vUv;
        float t = uTime * 0.15;

        float n1 = snoise(uv * 1.3 + t * 0.7);
        float n2 = snoise(uv * 2.5 - t * 0.5);
        float noise = n1 * 0.6 + n2 * 0.4;

        float wave = sin(uv.x * 2.5 + t + noise * 3.0) * uAmplitude * 0.4;
        wave += cos(uv.y * 2.0 - t * 0.8 + noise * 2.0) * uAmplitude * 0.3;

        vec3 color = mix(uColor1, uColor2, uv.x + noise * 0.5);
        color = mix(color, uColor3, uv.y - noise * 0.5 + wave);

        float dist = abs(uv.y - 0.5 + wave);
        float edgeSoftness = 1.8 - uBlend * 1.5; 
        float mask = smoothstep(edgeSoftness, 0.0, dist);
        
        color *= (1.5 + mask * 2.5);
        gl_FragColor = vec4(color, mask * 0.95);
      }
    `;

    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const program = gl.createProgram();
    if (!program) return;
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uniformLocs = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uColor1: gl.getUniformLocation(program, 'uColor1'),
      uColor2: gl.getUniformLocation(program, 'uColor2'),
      uColor3: gl.getUniformLocation(program, 'uColor3'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uBlend: gl.getUniformLocation(program, 'uBlend'),
    };

    const resize = () => {
      if (!canvas.parentElement) return;
      const displayWidth  = canvas.parentElement.clientWidth;
      const displayHeight = canvas.parentElement.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement || document.body);
    resize();

    let animationId: number;
    const render = (time: number) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uniformLocs.uTime, time * 0.001 * speed);
      gl.uniform2f(uniformLocs.uResolution, canvas.width, canvas.height);
      gl.uniform3fv(uniformLocs.uColor1, colors[0]);
      gl.uniform3fv(uniformLocs.uColor2, colors[1]);
      gl.uniform3fv(uniformLocs.uColor3, colors[2]);
      gl.uniform1f(uniformLocs.uAmplitude, amplitude);
      gl.uniform1f(uniformLocs.uBlend, blend);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [isMounted, colorStops, amplitude, blend, speed]);

  if (!isMounted) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className={cn("w-full h-full block pointer-events-none transition-opacity duration-1000", className)}
    />
  );
};

export default Aurora;
