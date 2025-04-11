// scene-config.interface.ts
export interface SceneConfig {
  backgroundColor: number;
  cameraPosition: {
    z: number;
    x?: number;
    y?: number;
  };
  faceColor: number;
  ambientLight: number;
  directionalLight: {
    color: number;
    intensity: number;
  };
}
