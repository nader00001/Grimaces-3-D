// scene-manager.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SceneConfig } from '../models/scene-config.interface';

@Injectable({ providedIn: 'root' })
export class SceneManagerService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId!: number;
  private faceMesh!: THREE.Mesh;

  private defaultConfig: SceneConfig = {
    backgroundColor: 0xf0f0f0,
    cameraPosition: { z: 5 },
    faceColor: 0xffaa00,
    ambientLight: 0x404040,
    directionalLight: { color: 0xffffff, intensity: 1 }
  };

  init(canvas: HTMLCanvasElement, config?: Partial<SceneConfig>): void {
    const mergedConfig = { ...this.defaultConfig, ...config };

    this.setupScene(mergedConfig);
    this.setupCamera(canvas, mergedConfig);
    this.setupRenderer(canvas);
    this.setupControls(canvas);
    this.setupLights(mergedConfig);
    this.createFaceMesh(mergedConfig);

    this.startAnimationLoop();
  }

  private setupScene(config: SceneConfig): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.backgroundColor);
  }

  private setupCamera(canvas: HTMLCanvasElement, config: SceneConfig): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = config.cameraPosition.z;
  }

  private setupRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(canvas.width, canvas.height);
  }

  private setupControls(canvas: HTMLCanvasElement): void {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
  }

  private setupLights(config: SceneConfig): void {
    const ambientLight = new THREE.AmbientLight(config.ambientLight);
    const directionalLight = new THREE.DirectionalLight(
      config.directionalLight.color,
      config.directionalLight.intensity
    );
    directionalLight.position.set(1, 1, 1);
    this.scene.add(ambientLight, directionalLight);
  }

  private createFaceMesh(config: SceneConfig): void {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: config.faceColor,
      specular: 0x111111,
      shininess: 30
    });

    this.faceMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.faceMesh);
  }

  updateFace(expression: string): void {
    // La logique sera implémentée via ExpressionMapperService
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
