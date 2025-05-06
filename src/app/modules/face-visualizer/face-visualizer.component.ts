import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  HostListener
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SkeletonHelper } from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

interface FacialBone {
  bone: THREE.Bone;
  neutralPosition: THREE.Vector3;
  neutralRotation: THREE.Euler;
  neutralScale: THREE.Vector3;
}

interface BoneTransform {
  rotation?: THREE.Euler;
  position?: THREE.Vector3;
  scale?: THREE.Vector3;
}

interface TearObject extends THREE.Object3D {
  velocity?: THREE.Vector3;
  material: THREE.Material | THREE.PointsMaterial;
}

interface CustomObject3D extends THREE.Object3D {
  isSkinnedMesh?: boolean;
  skeleton?: {
    bones: THREE.Bone[];
    update: () => void;
  };
  bindMatrixNeedsUpdate?: boolean;
  isBone?: boolean;
  morphTargetInfluences?: number[];
  isMesh?: boolean;
  material?: THREE.Material | THREE.Material[];
}

@Component({
  selector: 'app-face-visualizer',
  templateUrl: './face-visualizer.component.html',
  styleUrls: ['./face-visualizer.component.scss']
})
export class FaceVisualizerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('rendererCanvas') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() expression!: string;
  @Input() modelPath = 'assets/models/n_anniversary_40.glb';
  @Input() showControls = true;
  @Input() set wireframe(value: boolean) {
    this.setWireframeMode(value);
  }

  // Three.js properties
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private mixer!: THREE.AnimationMixer;
  private clock = new THREE.Clock();

  // Model properties
  private faceModel!: THREE.Group;
  private facialBones: Record<string, FacialBone> = {};
  modelLoaded = false;
  loadingProgress = 0;

  // Animation/effects properties
  private animationFrameId?: number;
  private tears: THREE.Mesh[] = [];
  private currentEmotionEffects: THREE.Object3D[] = [];
  private particleSystems: THREE.Group[] = [];
  private currentAnimationAction: THREE.AnimationAction | null = null;
  private availableAnimations: Record<string, THREE.AnimationClip | undefined> = {};

  // Performance optimization
  private resizeObserver?: ResizeObserver;
  private lastUpdateTime = 0;
  private updateInterval = 1000 / 60; // 60 FPS

  private sleepZzzGroup?: THREE.Group;

  // Expressions configuration
  private expressionsConfig: Record<string, Record<string, BoneTransform>> = {
    'rire': {
    'jaw': {
      rotation: new THREE.Euler(0.5, 0, 0),
      position: new THREE.Vector3(0, -0.1, 0)
    },
    'mouth': {
      scale: new THREE.Vector3(1.3, 0.8, 1),
      position: new THREE.Vector3(0, -0.05, 0)
    },
    'brow_L': { rotation: new THREE.Euler(-0.3, 0, 0.1) },
    'brow_R': { rotation: new THREE.Euler(-0.3, 0, -0.1) },
    'eye_L': { rotation: new THREE.Euler(0, 0, -0.2) },
    'eye_R': { rotation: new THREE.Euler(0, 0, 0.2) },
    'cheek_L': { scale: new THREE.Vector3(1.2, 1, 1) },
    'cheek_R': { scale: new THREE.Vector3(1.2, 1, 1) },
    'arm_L': { rotation: new THREE.Euler(-0.5, 0, -0.3) },
    'arm_R': { rotation: new THREE.Euler(-0.5, 0, 0.3) },
    'hand_L': { rotation: new THREE.Euler(0, 0, -0.5) },
    'hand_R': { rotation: new THREE.Euler(0, 0, 0.5) }
  },
    'triste': {
      'brow_L': { rotation: new THREE.Euler(0.4, 0.2, 0) },
      'brow_R': { rotation: new THREE.Euler(0.4, -0.2, 0) },
      'jaw': { rotation: new THREE.Euler(-0.2, 0, 0) },
      'eyeLidUpper_L': { rotation: new THREE.Euler(0.2, 0, 0) },
      'eyeLidUpper_R': { rotation: new THREE.Euler(0.2, 0, 0) },
      'mouth': { rotation: new THREE.Euler(0, 0, -0.3) },
      'head': { rotation: new THREE.Euler(-0.1, 0, 0) }
    },
    'surpris': {
      'brow_L': { rotation: new THREE.Euler(-0.5, 0, 0) },
      'brow_R': { rotation: new THREE.Euler(-0.5, 0, 0) },
      'eye_L': { scale: new THREE.Vector3(1.2, 1.2, 1) },
      'eye_R': { scale: new THREE.Vector3(1.2, 1.2, 1) },
      'jaw': { rotation: new THREE.Euler(0.3, 0, 0) },
      'mouth': { scale: new THREE.Vector3(1.3, 1, 1) }
    },
    'colere': {
      'brow_L': { rotation: new THREE.Euler(0.3, -0.3, 0.2) },
      'brow_R': { rotation: new THREE.Euler(0.3, 0.3, -0.2) },
      'jaw': { rotation: new THREE.Euler(0, 0, 0.1) },
      'nose': { scale: new THREE.Vector3(1.1, 1, 1) },
      'mouth': { rotation: new THREE.Euler(0, 0, 0.3) }
    },
    'degout': {
      'brow_L': { rotation: new THREE.Euler(0.2, -0.1, 0.1) },
      'brow_R': { rotation: new THREE.Euler(0.2, 0.1, -0.1) },
      'nose': { scale: new THREE.Vector3(1.1, 0.9, 1) },
      'mouth': { rotation: new THREE.Euler(0.2, 0, 0) },
      'eye_L': { scale: new THREE.Vector3(0.9, 0.9, 1) },
      'eye_R': { scale: new THREE.Vector3(0.9, 0.9, 1) }
    },
    'neutre': {},
    'course': {
      'brow_L': { rotation: new THREE.Euler(-0.3, 0, 0.1) },
      'brow_R': { rotation: new THREE.Euler(-0.3, 0, -0.1) },
      'jaw': { rotation: new THREE.Euler(0.2, 0, 0) },
      'mouth': { scale: new THREE.Vector3(1.1, 0.8, 1) },
      'eye_L': { scale: new THREE.Vector3(1.1, 0.9, 1) },
      'eye_R': { scale: new THREE.Vector3(1.1, 0.9, 1) }
    },
    'jouer': {
      'eye_L': { rotation: new THREE.Euler(0, 0, -0.3) },
      'eye_R': { rotation: new THREE.Euler(0, 0, 0.3) },
      'brow_L': { rotation: new THREE.Euler(-0.4, 0, 0) },
      'mouth': { scale: new THREE.Vector3(1.1, 1.1, 1) }
    },
    'dormir': {
  'eye_L': { scale: new THREE.Vector3(1, 0.1, 1) },
  'eye_R': { scale: new THREE.Vector3(1, 0.1, 1) },
  'head': { rotation: new THREE.Euler(0.1, 0, 0) },
  'jaw': { rotation: new THREE.Euler(-0.1, 0, 0) },
  'brow_L': { rotation: new THREE.Euler(0.1, 0, 0) },
  'brow_R': { rotation: new THREE.Euler(0.1, 0, 0) },
  'foot_L': {
    rotation: new THREE.Euler(0.2, 0, 0),
    position: new THREE.Vector3(0, -0.1, 0)
  },
  'foot_R': {
    rotation: new THREE.Euler(0.2, 0, 0),
    position: new THREE.Vector3(0, -0.1, 0)
  },
  'leg_L': { rotation: new THREE.Euler(-0.1, 0, 0) },
  'leg_R': { rotation: new THREE.Euler(-0.1, 0, 0) }
}
  };

  // Ambiance effects
  private ambianceEffects: Record<string, () => void> = {
    'course': this.createRunningDust.bind(this),
    'jouer': this.createPlayfulBubbles.bind(this),
    'dormir': this.createSleepZzz.bind(this),
    'colere': this.createAngerParticles.bind(this),
    'surpris': this.createSparkleParticles.bind(this),
    'rire': this.createLaughingEffect.bind(this)
  };

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadFaceModel();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.modelPath && !changes.modelPath.firstChange) {
      setTimeout(() => {
        this.resetScene();
      });
    }

    if (changes.expression && this.modelLoaded) {
      this.applyExpression(this.expression);
    }
  }

  ngOnDestroy(): void {
    this.cleanUp();
  }

  @HostListener('window:resize')
  private onWindowResize(): void {
    this.resizeThreeJS();
  }

  private initThreeJS(): void {
    if (!this.checkWebGLAvailability()) {
      console.error('WebGL is not supported in this browser');
      this.createBasicFace();
      return;
    }

    this.scene = new THREE.Scene();
    this.initRenderer();

    if (this.renderer) {
      this.initCamera();
      if (this.showControls) {
        this.initControls();
      }
      this.initLights();
      this.startAnimationLoop();
    } else {
      this.createBasicFace();
    }
  }

  private initRenderer(): void {
    if (!this.canvasRef?.nativeElement) {
      console.error('Canvas element not found');
      return;
    }

    try {
      const rendererOptions = {
        canvas: this.canvasRef.nativeElement,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      };

      this.renderer = new THREE.WebGLRenderer(rendererOptions);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.shadowMap.enabled = true;
      this.resizeThreeJS();
    } catch (error) {
      console.error('Error initializing WebGLRenderer:', error);
      this.fallbackToBasicRender();
    }
  }

  private fallbackToBasicRender(): void {
    console.warn('WebGL not available, falling back to basic render');
    console.error('WebGL not available, and no fallback renderer is supported. Please ensure WebGL is enabled in your browser.');
  }

  private initCamera(): void {
    if (!this.canvasRef?.nativeElement) return;

    const width = this.canvasRef.nativeElement.clientWidth;
    const height = this.canvasRef.nativeElement.clientHeight;

    this.camera = new THREE.PerspectiveCamera(
      40,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 50);
    this.scene.add(this.camera);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minPolarAngle = 0;
    this.controls.maxAzimuthAngle = Math.PI / 2;
    this.controls.minAzimuthAngle = -Math.PI / 2;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 1024;
    directionalLight1.shadow.mapSize.height = 1024;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, 1, -1);

    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);

    this.scene.add(directionalLight1, directionalLight2, hemisphereLight);
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (time - this.lastUpdateTime > this.updateInterval) {
        const delta = this.clock.getDelta();

        if (this.mixer) {
          this.mixer.update(delta);
        }

        this.applyExpressionAnimation(this.expression, delta);

        if (this.controls) {
          this.controls.update();
        }

        this.updateParticles();
        this.renderer.render(this.scene, this.camera);
        this.lastUpdateTime = time;
      }
    };

    animate(0);
  }

  private applyExpressionAnimation(expression: string, delta: number): void {
    switch (expression) {
      case 'course':
        this.simulateRunning();
        break;
      case 'dormir':
        this.simulateBreathing();
        break;
      case 'jouer':
        this.simulatePlaying();
        break;
      case 'rire':
        this.simulateLaughing();
        break;
    }
  }


  private simulateLaughing(): void {
    const time = Date.now() * 0.005;
    const laughIntensity = Math.sin(time * 3) * 0.1 + 0.9; // Oscillation entre 0.8 et 1.0

    // Animation de la mâchoire et de la bouche
    const jaw = this.findBone('jaw') || this.findBone('mouth');
    if (jaw) {
      jaw.rotation.x = 0.5 + Math.sin(time * 4) * 0.1; // Mouvement de bouche dynamique
      jaw.position.y = -0.1 + Math.sin(time * 5) * 0.02; // Léger mouvement vertical
    }

    // Animation des joues
    const cheekL = this.findBone('cheek_L');
    const cheekR = this.findBone('cheek_R');
    if (cheekL && cheekR) {
      const cheekScale = 1.2 * laughIntensity;
      cheekL.scale.set(cheekScale, 1, 1);
      cheekR.scale.set(cheekScale, 1, 1);
    }

    // Animation des bras et mains
    const leftArm = this.findBone('leftArm') || this.findBone('arm_L');
    const rightArm = this.findBone('rightArm') || this.findBone('arm_R');
    const leftHand = this.findBone('leftHand') || this.findBone('hand_L');
    const rightHand = this.findBone('rightHand') || this.findBone('hand_R');

    if (leftArm && rightArm && leftHand && rightHand) {
      leftArm.rotation.x = -0.5 + Math.sin(time) * 0.1;
      rightArm.rotation.x = -0.5 + Math.sin(time) * 0.1;
      leftHand.rotation.z = -0.5 + Math.sin(time * 1.5) * 0.2;
      rightHand.rotation.z = 0.5 + Math.sin(time * 1.5) * 0.2;
    }

    // Animation de la tête
    const head = this.findBone('head');
    if (head) {
      head.rotation.y = Math.sin(time * 0.3) * 0.05;
      head.rotation.x = Math.sin(time * 0.5) * 0.02;
    }
  }


  private createLaughingEffect(): void {
    const laughParticles = new THREE.Group();

    // Créer des particules en forme de notes de musique ou d'étoiles
    for (let i = 0; i < 20; i++) {
      // Alterner entre sphères et étoiles
      const geometry = Math.random() > 0.5
        ? new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 8, 8)
        : new THREE.SphereGeometry(0.03, 5, 5); // Étoiles simplifiées

      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
      });
      const particle = new THREE.Mesh(geometry, material);

      // Position autour de la bouche
      particle.position.set(
        (Math.random() * 1.5 - 0.75),
        -0.5 + (Math.random() * 0.5),
        (Math.random() * 0.5) + 0.5
      );

      // Animation aléatoire plus dynamique
      (particle as any).speed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.05 + 0.03,
        (Math.random() - 0.5) * 0.01
      );

      // Rotation aléatoire
      (particle as any).rotationSpeed = new THREE.Vector3(
        Math.random() * 0.02,
        Math.random() * 0.02,
        Math.random() * 0.02
      );

      laughParticles.add(particle);
    }

    this.scene.add(laughParticles);
    this.currentEmotionEffects.push(laughParticles);
    this.particleSystems.push(laughParticles);
  }

  private simulateRunning(): void {
    const leftLeg = this.findBone('leftLeg') || this.findBone('leg_L');
    const rightLeg = this.findBone('rightLeg') || this.findBone('leg_R');
    const leftFoot = this.findBone('leftFoot') || this.findBone('foot_L');
    const rightFoot = this.findBone('rightFoot') || this.findBone('foot_R');
    const head = this.findBone('head');

    if (leftLeg && rightLeg && leftFoot && rightFoot) {
      const time = Date.now() * 0.005;

      leftLeg.rotation.x = Math.sin(time) * 0.5;
      rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;

      leftFoot.rotation.x = Math.sin(time) * 0.3;
      rightFoot.rotation.x = Math.sin(time + Math.PI) * 0.3;

      if (head) {
        head.rotation.y = Math.sin(time * 0.5) * 0.1;
      }
    }
  }

  private simulateBreathing(): void {
    const chest = this.findBone('chest') || this.findBone('spine');
    const head = this.findBone('head');
    const leftFoot = this.findBone('leftFoot') || this.findBone('foot_L');
    const rightFoot = this.findBone('rightFoot') || this.findBone('foot_R');
    const leftLeg = this.findBone('leftLeg') || this.findBone('leg_L');
    const rightLeg = this.findBone('rightLeg') || this.findBone('leg_R');

    if (chest && head) {
      const time = Date.now() * 0.001;
      const breathAmount = Math.sin(time) * 0.01;

      chest.position.y += breathAmount * 0.5;
      head.position.y += breathAmount * 0.2;
      head.rotation.z = Math.sin(time * 0.3) * 0.02;
      head.rotation.x = 0.1 + Math.sin(time * 0.5) * 0.01;
    }

    // Animation des jambes et pieds pour une position plus naturelle
    if (leftFoot && rightFoot && leftLeg && rightLeg) {
      const time = Date.now() * 0.001;
      const footMovement = Math.sin(time * 0.5) * 0.02;

      leftFoot.rotation.x = 0.2 + footMovement;
      rightFoot.rotation.x = 0.2 + footMovement;

      // Légère rotation des jambes pour un effet plus naturel
      leftLeg.rotation.x = -0.1 + footMovement * 0.5;
      rightLeg.rotation.x = -0.1 + footMovement * 0.5;
    }
  }
  private initFootBones(): void {
    const leftFoot = this.findBone('leftFoot') || this.findBone('foot_L');
    const rightFoot = this.findBone('rightFoot') || this.findBone('foot_R');

    if (leftFoot && !this.facialBones['foot_L']) {
      this.facialBones['foot_L'] = {
        bone: leftFoot,
        neutralPosition: leftFoot.position.clone(),
        neutralRotation: leftFoot.rotation.clone(),
        neutralScale: leftFoot.scale.clone()
      };
    }

    if (rightFoot && !this.facialBones['foot_R']) {
      this.facialBones['foot_R'] = {
        bone: rightFoot,
        neutralPosition: rightFoot.position.clone(),
        neutralRotation: rightFoot.rotation.clone(),
        neutralScale: rightFoot.scale.clone()
      };
    }
  }

  private simulatePlaying(): void {
    const leftArm = this.findBone('leftArm') || this.findBone('arm_L');
    const rightArm = this.findBone('rightArm') || this.findBone('arm_R');
    const head = this.findBone('head');

    if (leftArm && rightArm) {
      const time = Date.now() * 0.003;

      leftArm.rotation.x = Math.sin(time) * 0.2 + 0.5;
      rightArm.rotation.x = Math.sin(time + Math.PI) * 0.2 + 0.5;

      if (head) {
        head.rotation.x = Math.sin(time * 1.5) * 0.1;
      }
    }
  }

  private loadFaceModel(): void {
    if (!this.modelPath) {
      console.error('Model path not specified');
      this.createBasicFace();
      return;
    }

    this.loadingProgress = 5;
    this.modelLoaded = false;

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    console.log('Starting to load model:', this.modelPath);

    loader.load(
      this.modelPath,
      (gltf) => {
        console.log('Model successfully loaded:', gltf);
        this.loadingProgress = 100;
        this.handleModelLoaded(gltf);
      },
      (xhr) => {
        this.loadingProgress = Math.min(99, (xhr.loaded / (xhr.total || 1)) * 100);
        console.log(`Loading progress: ${this.loadingProgress}%`);
      },
      (error) => {
        console.error('Error loading model:', error);
        this.loadingProgress = 0;
        this.createBasicFace();
        this.loadModelWithoutDraco();
      }
    );
  }

  private loadModelWithoutDraco(): void {
    const loader = new GLTFLoader();

    loader.load(
      this.modelPath,
      (gltf) => {
        console.log('Model loaded without Draco compression');
        this.loadingProgress = 100;
        this.handleModelLoaded(gltf);
      },
      undefined,
      (error) => {
        console.error('Error loading model without Draco:', error);
        this.createBasicFace();
      }
    );
  }

  private handleModelLoaded(gltf: any): void {
    console.group('Model Loading Debug');
    this.logAvailableBones(); // Ajoutez cette ligne
    try {
      console.log('GLTF content:', gltf);
      console.log('Scene children:', gltf.scene.children);

      this.faceModel = gltf.scene;

      if (!this.faceModel) {
        throw new Error('Loaded model is empty');
      }

      this.setupModel(gltf);
      this.createEnvironment();
      this.scene.add(this.faceModel);
      this.initFacialRig(gltf);
      this.initFootBones();
      this.normalizeModelSize();
      this.modelLoaded = true;
      this.loadingProgress = 100;

      if (this.expression) {
        this.applyExpression(this.expression);
      }
    } catch (error) {
      console.error('Error processing loaded model:', error);
      this.createBasicFace();
    }
  }

  private setupModel(gltf: any): void {
    gltf.scene.traverse((child: CustomObject3D) => {
      if (child.isSkinnedMesh) {
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.skeleton) {
          (this.faceModel as any).mainSkeleton = child.skeleton;
        }
      }

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if ((mat as THREE.MeshStandardMaterial).metalness !== undefined) {
              (mat as THREE.MeshStandardMaterial).metalness = 0.1;
              (mat as THREE.MeshStandardMaterial).roughness = 0.5;
            }
          });
        } else if ((mesh.material as THREE.MeshStandardMaterial).metalness !== undefined) {
          (mesh.material as THREE.MeshStandardMaterial).metalness = 0.1;
          (mesh.material as THREE.MeshStandardMaterial).roughness = 0.5;
        }
      }
    });

    if (gltf.animations?.length) {
      this.setupBodyAnimations(gltf);
    }
  }

  private createEnvironment(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x88aa55,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
  }

  private initFacialRig(gltf: any): void {
    this.facialBones = {};
    this.detectStandardBones(gltf);

    if (Object.keys(this.facialBones).length < 4) {
      this.detectAlternativeBones(gltf);
    }

    if (Object.keys(this.facialBones).length < 4) {
      this.setupFallbackBones(gltf);
    }

    // Initialiser les os des pieds
    this.initFootBones();

  // Initialiser les os des bras et mains
    this.initArmBones();


    console.log('Bones detected:', this.facialBones);
  }


  private initArmBones(): void {
    const bonesToInit = [
      { name: 'leftArm', key: 'arm_L' },
      { name: 'rightArm', key: 'arm_R' },
      { name: 'leftHand', key: 'hand_L' },
      { name: 'rightHand', key: 'hand_R' }
    ];

    bonesToInit.forEach(({name, key}) => {
      const bone = this.findBone(name) || this.findBone(key);
      if (bone && !this.facialBones[key]) {
        this.facialBones[key] = {
          bone: bone,
          neutralPosition: bone.position.clone(),
          neutralRotation: bone.rotation.clone(),
          neutralScale: bone.scale.clone()
        };
      }
    });
  }

  private detectStandardBones(gltf: any): void {
    const bonePatterns = [
      { regex: /jaw|chin|mandible/i, key: 'jaw' },
      { regex: /brow|eyebrow/i, key: 'brow' },
      { regex: /eye|lid/i, key: 'eye' },
      { regex: /mouth|lip/i, key: 'mouth' },
      { regex: /cheek/i, key: 'cheek' },
      { regex: /head|neck/i, key: 'head' },
      { regex: /nose/i, key: 'nose' },
      { regex: /arm|upperarm|shoulder/i, key: 'arm' },
      { regex: /hand|wrist|palm/i, key: 'hand' },
      { regex: /leg|thigh/i, key: 'leg' },
      { regex: /foot|ankle/i, key: 'foot' }
    ];

    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();

        for (const {regex, key} of bonePatterns) {
          if (regex.test(boneName)) {
            const side = boneName.includes('left') || boneName.includes('_l') ? '_L' :
                       boneName.includes('right') || boneName.includes('_r') ? '_R' : '';
            const boneKey = key + side;

            if (!this.facialBones[boneKey]) {
              this.facialBones[boneKey] = {
                bone: child as THREE.Bone,
                neutralPosition: child.position.clone(),
                neutralRotation: child.rotation.clone(),
                neutralScale: child.scale.clone()
              };
            }
            break;
          }
        }
      }
    });
  }

  private detectAlternativeBones(gltf: any): void {
    const altPatterns = [
      { regex: /^brow_l/i, key: 'brow_L' },
      { regex: /^brow_r/i, key: 'brow_R' },
      { regex: /^eye_l/i, key: 'eye_L' },
      { regex: /^eye_r/i, key: 'eye_R' },
    ];

    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Bone).isBone) {
        for (const {regex, key} of altPatterns) {
          if (regex.test(child.name) && !this.facialBones[key]) {
            this.facialBones[key] = {
              bone: child as THREE.Bone,
              neutralPosition: child.position.clone(),
              neutralRotation: child.rotation.clone(),
              neutralScale: child.scale.clone()
            };
            break;
          }
        }
      }
    });
  }

  private setupFallbackBones(gltf: any): void {
    if (Object.keys(this.facialBones).length === 0) {
      console.warn('No standard facial bones detected, using first bones found');
      let boneCount = 0;
      gltf.scene.traverse((child: CustomObject3D) => {
        if ((child as THREE.Bone).isBone && boneCount < 7) {
          const fallbackTypes = ['jaw', 'brow_L', 'brow_R', 'eye_L', 'eye_R', 'mouth', 'head'];
          this.facialBones[fallbackTypes[boneCount]] = {
            bone: child as THREE.Bone,
            neutralPosition: child.position.clone(),
            neutralRotation: child.rotation.clone(),
            neutralScale: child.scale.clone()
          };
          boneCount++;
        }
      });
    }
  }

  private applyExpression(expression: string): void {
    if (!this.modelLoaded) return;
    // Transition douce vers la nouvelle expression

    this.clearEmotionEffects();
    this.resetBonesToNeutral();

    // Gérer les animations
    if (expression === 'neutre') {
      // Arrêter toutes les animations
      if (this.currentAnimationAction) {
        this.currentAnimationAction.stop();
        this.currentAnimationAction = null;
      }
    } else if (this.availableAnimations[expression]) {
      this.playAnimation(expression);
    }

    if (Object.keys(this.facialBones).length === 0) {
      this.applyExpressionToMesh(expression);
      return;
    }

    // Appliquer les transformations et effets
    this.applyBoneTransforms(expression);
    this.applySpecialEffects(expression);
    this.updateSkeleton();
  }

  private applyExpressionToMesh(expression: string): void {
    // Animation basée sur les morph targets ou la transformation du mesh
    this.faceModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        switch(expression) {
          case 'rire':
            // Exemple: déformer le mesh pour un sourire
            if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0) {
              // Utiliser les morph targets si disponibles
              mesh.morphTargetInfluences[0] = 1.0; // Index à adapter
            } else {
              // Sinon, transformation manuelle
              mesh.rotation.x = 0.1;
              mesh.scale.set(1.1, 1, 1);
            }
            break;
          // ... autres expressions ...
        }
      }
    });

    // Ajouter des effets visuels
    switch(expression) {
      case 'rire':
        this.createLaughingEffect();
        break;
      // ... autres effets ...
    }
  }

  private playAnimation(animationName: string): void {
    try {
      // Arrêter proprement l'animation en cours
      if (this.currentAnimationAction) {
        this.currentAnimationAction.stop();
        this.currentAnimationAction = null;
      }

      // Si on passe à neutre, on ne joue aucune animation
      if (animationName === 'neutre') {
        return;
      }

      const animation = this.availableAnimations[animationName];

      if (animation && this.mixer) {
        this.currentAnimationAction = this.mixer.clipAction(animation);

        // Configurer la nouvelle animation
        this.currentAnimationAction
          .reset() // Réinitialiser l'animation
          .setEffectiveTimeScale(1)
          .setLoop(THREE.LoopRepeat, Infinity) // Par défaut en boucle infinie
          .fadeIn(0.3) // Fondu d'entrée
          .play();

        // Configurations spécifiques
        this.configureSpecificAnimations(animationName);

      } else if (animationName !== 'neutre') {
        console.warn(`Animation "${animationName}" non trouvée ou mixer non initialisé`);
      }
    } catch (error) {
      console.error(`Erreur lors de la lecture de l'animation ${animationName}:`, error);
    }
  }

  private configureSpecificAnimations(animationName: string): void {
    if (!this.currentAnimationAction) return;

    switch(animationName) {
      case 'course':
        this.currentAnimationAction
          .setEffectiveTimeScale(1.5)
          .setLoop(THREE.LoopRepeat, Infinity);
        break;

      case 'dormir':
        this.currentAnimationAction
          .setEffectiveTimeScale(0.8)
          .setLoop(THREE.LoopRepeat, Infinity);
        break;

      case 'jouer':
        this.currentAnimationAction
          .setEffectiveTimeScale(1.2)
          .setLoop(THREE.LoopPingPong, Infinity);
        break;
    }
  }

  private resetBonesToNeutral(): void {
    Object.values(this.facialBones).forEach(({bone, neutralPosition, neutralRotation, neutralScale}) => {
      bone.position.copy(neutralPosition);
      bone.rotation.copy(neutralRotation);
      bone.scale.copy(neutralScale);
    });
  }

  private findBone(name: string): THREE.Bone | null {
    let foundBone: THREE.Bone | null = null;
    this.faceModel?.traverse((child) => {
      if (child instanceof THREE.Bone && child.name.toLowerCase().includes(name.toLowerCase())) {
        foundBone = child;
      }
    });
    return foundBone;
  }

  private applyBoneTransforms(expression: string): void {
    const config = this.expressionsConfig[expression] || this.expressionsConfig['neutre'];
    const missingBones: string[] = [];

    Object.entries(config).forEach(([boneType, transform]) => {
      const facialBone = this.facialBones[boneType];
      if (facialBone) {
        if (transform.rotation) {
          facialBone.bone.rotation.copy(transform.rotation);
        }
        if (transform.position) {
          facialBone.bone.position.copy(transform.position);
        }
        if (transform.scale) {
          facialBone.bone.scale.copy(transform.scale);
        }
      } else {
        missingBones.push(boneType);
      }
    });

    if (missingBones.length > 0) {
      console.warn(`Bones not found for expression ${expression}:`, missingBones);
      this.tryAlternativeBoneNames(expression, config, missingBones);
    }
  }

  private tryAlternativeBoneNames(expression: string, config: Record<string, BoneTransform>, missingBones: string[]): void {
    const boneNameVariations: Record<string, string[]> = {
      'brow_L': ['browLeft', 'eyebrow_l', 'leftBrow', 'brow.L', 'brow_Left', 'LeftBrow'],
      'brow_R': ['browRight', 'eyebrow_r', 'rightBrow', 'brow.R', 'brow_Right', 'RightBrow'],
      'eye_L': ['eyeLeft', 'leftEye', 'eye.L', 'eye_Left', 'LeftEye'],
      'eye_R': ['eyeRight', 'rightEye', 'eye.R', 'eye_Right', 'RightEye'],
      'cheek_L': ['cheekLeft', 'leftCheek', 'cheek.L', 'cheek_Left'],
      'cheek_R': ['cheekRight', 'rightCheek', 'cheek.R', 'cheek_Right'],
      'arm_L': ['leftArm', 'armLeft', 'upperarm_l', 'LeftArm', 'Arm_L'],
      'arm_R': ['rightArm', 'armRight', 'upperarm_r', 'RightArm', 'Arm_R'],
      'hand_L': ['leftHand', 'handLeft', 'hand_l', 'LeftHand', 'Hand_L'],
      'hand_R': ['rightHand', 'handRight', 'hand_r', 'RightHand', 'Hand_R']
    };

    missingBones.forEach(boneType => {
      const variations = boneNameVariations[boneType] || [];
      for (const variation of variations) {
        if (this.facialBones[variation]) {
          const transform = config[boneType];
          this.applyTransformToBone(this.facialBones[variation].bone, transform);
          console.log(`Used alternative bone ${variation} for ${boneType}`);
          break;
        }
      }
    });
  }

  private applyTransformToBone(bone: THREE.Bone, transform: BoneTransform): void {
    if (transform.rotation) {
      bone.rotation.copy(transform.rotation);
    }
    if (transform.position) {
      bone.position.copy(transform.position);
    }
    if (transform.scale) {
      bone.scale.copy(transform.scale);
    }
  }

  private applySpecialEffects(expression: string): void {
    this.clearEmotionEffects();

    if (this.ambianceEffects[expression]) {
      this.ambianceEffects[expression]();
    }

    switch(expression) {
      case 'triste':
        this.addTears();
        break;
      case 'colere':
        this.addAngerEffect();
        break;
      case 'surpris':
        this.addSparkleEffect();
        break;
      case 'degout':
        this.addDisgustEffect();
        break;
      case 'rire':
        this.addLaughEffect();
        break;
    }
  }

  private addLaughEffect(): void {
    // Vous pouvez ajouter des effets supplémentaires ici si nécessaire
  }
  private updateSkeleton(): void {
    const skeleton = (this.faceModel as any).mainSkeleton;
    if (skeleton) {
      skeleton.update();
    } else {
      this.faceModel?.traverse((child: CustomObject3D) => {
        if ((child as THREE.Bone).isBone) {
          child.updateMatrixWorld(true);
        }
      });
    }
  }

  private addTears(): void {
    const leftEye = this.findBone('eye_L') || this.findBone('leftEye');
    const rightEye = this.findBone('eye_R') || this.findBone('rightEye');

    // Créer un mélange de larmes normales et bleues
    const tearCount = 12; // Augmenter le nombre pour un effet plus visible

    for (let i = 0; i < tearCount; i++) {
      // 70% de chance de créer une larme bleue, 30% une larme normale
      const isBlueTear = Math.random() > 0.3;
      const tear = isBlueTear ? this.createBlueTear() : this.createTearMesh(0.07, 0.8);

      // Position aléatoire sous les yeux
      const eyePosition = (i % 2 === 0 && leftEye) ?
        leftEye.getWorldPosition(new THREE.Vector3()) :
        (rightEye ? rightEye.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 0, 0));

      tear.position.set(
        eyePosition.x + (Math.random() * 0.4 - 0.2), // Plus large dispersion
        eyePosition.y - 0.1 - (Math.random() * 0.4),
        eyePosition.z + 0.1 + (Math.random() * 0.1)
      );

      // Animation plus dynamique pour les larmes bleues
      (tear as any).velocity = new THREE.Vector3(
        isBlueTear ? (Math.random() - 0.5) * 0.03 : 0, // Mouvement latéral aléatoire
        -0.06 - Math.random() * 0.04, // Descente plus rapide
        0
      );

      // Ajouter un effet de scintillement aux larmes bleues
      if (isBlueTear) {
        (tear as any).pulseSpeed = 2 + Math.random() * 3;
        (tear as any).baseSize = tear.scale.clone();
      }

      this.scene.add(tear);
      this.tears.push(tear);
      this.currentEmotionEffects.push(tear);
    }
  }

  private createBlueTear(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.04, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.9,
      specular: 0xFFFFFF, // Plus de brillance
      shininess: 50,
      emissive: 0x008080, // Légère émission de lumière
      emissiveIntensity: 0.3
    });

    return new THREE.Mesh(geometry, material);
  }

  private createTearMesh(size: number, opacity: number): THREE.Mesh {
    // Utiliser une géométrie de larme plus réaliste (cône à la place d'une sphère)
    const geometry = new THREE.ConeGeometry(size, size * 2, 8);
    geometry.rotateX(Math.PI); // Orienter la pointe vers le bas

    const material = new THREE.MeshPhongMaterial({
      color: 0x99ddff, // Couleur plus claire pour les larmes
      transparent: true,
      opacity: opacity,
      specular: 0x111111,
      shininess: 100,
      refractionRatio: 0.8 // Ajouter un effet de réfraction
    });

    return new THREE.Mesh(geometry, material);
  }

  private addAngerEffect(): void {
    const angerParticles = new THREE.Group();
    for (let i = 0; i < 15; i++) {
      const particle = this.createParticle(0xff3300);
      particle.position.set(
        Math.random() * 0.5 - 0.25,
        1.5 + Math.random() * 0.3,
        Math.random() * 0.3 - 0.15
      );
      angerParticles.add(particle);
    }
    this.scene.add(angerParticles);
    this.currentEmotionEffects.push(angerParticles);
    this.particleSystems.push(angerParticles);
  }

  private addSparkleEffect(): void {
    const sparkles = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const sparkle = this.createParticle(0xffff00);
      sparkle.position.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 0.5,
        Math.random() * 2 - 1
      );
      sparkles.add(sparkle);
    }
    this.scene.add(sparkles);
    this.currentEmotionEffects.push(sparkles);
    this.particleSystems.push(sparkles);
  }

  private addDisgustEffect(): void {
    const greenCloud = this.createParticleCloud(0x55ff55, 10, 0.5);
    greenCloud.position.set(0, 0.5, 1);
    this.scene.add(greenCloud);
    this.currentEmotionEffects.push(greenCloud);
    this.particleSystems.push(greenCloud);
  }

  private createParticle(color: number): THREE.Mesh {
    const size = 0.05 + Math.random() * 0.05;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    return new THREE.Mesh(geometry, material);
  }

  private createParticleCloud(color: number, count: number, size: number): THREE.Group {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const particle = this.createParticle(color);
      particle.position.set(
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size
      );
      group.add(particle);
    }
    return group;
  }

  private clearEmotionEffects(): void {
    this.tears.forEach(tear => this.scene.remove(tear));
    this.tears = [];

    this.currentEmotionEffects.forEach(effect => this.scene.remove(effect));
    this.currentEmotionEffects = [];

    this.particleSystems.forEach(sys => this.scene.remove(sys));
    this.particleSystems = [];
  }

  private setupBodyAnimations(gltf: any): void {
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    const animations = gltf.animations || [];

    this.availableAnimations = {
      course: animations.find(clip => clip.name.toLowerCase().includes('run') ||
                                    clip.name.toLowerCase().includes('course')),
      dormir: animations.find(clip => clip.name.toLowerCase().includes('sleep') ||
                                     clip.name.toLowerCase().includes('dormir')),
      jouer: animations.find(clip => clip.name.toLowerCase().includes('play') ||
                                    clip.name.toLowerCase().includes('jouer'))
    };
  }

  private updateParticles(): void {
    // Mise à jour des systèmes de particules existants
    this.particleSystems.forEach(group => {
      group.children.forEach(particle => {
      if ((particle as any).speed) {
        particle.position.add((particle as any).speed);
      }
      if ((particle as any).rotationSpeed) {
        particle.rotation.x += (particle as any).rotationSpeed.x;
        particle.rotation.y += (particle as any).rotationSpeed.y;
        particle.rotation.z += (particle as any).rotationSpeed.z;
      }

        if ((particle as THREE.Mesh).material instanceof THREE.Material) {
          const mat = (particle as THREE.Mesh).material as THREE.Material & { opacity?: number };
          if (mat.opacity !== undefined) {
            mat.opacity *= 0.98;
          }
        }

        if (particle.position.y > 3 || (particle.scale.x < 0.01)) {
          group.remove(particle);
        }
      });

      if (group.children.length < 5) {
        const newParticle = this.createParticle(0xffffff * Math.random());
        newParticle.position.set(
          Math.random() * 2 - 1,
          -1,
          Math.random() * 2 - 1
        );
        group.add(newParticle);
      }
    });

    // Mise à jour des larmes
    this.tears.forEach((tear, index) => {
      if ((tear as any).velocity) {
        tear.position.add((tear as any).velocity);

        // Réduire progressivement l'opacité
        if ((tear.material as THREE.Material & { opacity?: number }).opacity !== undefined) {
          (tear.material as THREE.Material & { opacity: number }).opacity *= 0.97;
        }

        // Supprimer la larme si elle est trop transparente ou trop basse
        if ((tear.material as THREE.Material & { opacity?: number }).opacity < 0.1 ||
            tear.position.y < -3) {
          this.scene.remove(tear);
          this.tears.splice(index, 1);
        }
      }
    });

    // Ajouter de nouvelles larmes périodiquement si l'expression est toujours "triste"
    if (this.expression === 'triste' && this.tears.length < 3 && Math.random() > 0.9) {
      this.addTears();
    }

    if (this.sleepZzzGroup && this.expression === 'dormir') {
      const time = Date.now() * 0.001;
      this.sleepZzzGroup.children.forEach((zMesh, i) => {
        const z = zMesh as THREE.Mesh & { offset: number, speed: number, startY: number };
        z.position.y = z.startY + Math.sin(time * z.speed + z.offset) * 0.05;
        z.rotation.z = Math.sin(time * 0.3 * z.speed) * 0.1;
        z.position.x += 0.01;

        // Réapparition si le Z sort de l'écran
        if (z.position.x > 2) {
          z.position.x = -1;
          z.position.y = 1.8 - i * 0.1;
        }
      });
    }
  }


  private createRunningDust(): void {
    const dustParticles = new THREE.Group();
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xaaaaaa })
      );

      particle.position.set(
        (Math.random() - 0.5) * 2,
        -2 + Math.random() * 0.5,
        (Math.random() - 0.5) * 2
      );

      (particle as any).speed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.05,
        (Math.random() - 0.5) * 0.02
      );

      dustParticles.add(particle);
    }

    this.scene.add(dustParticles);
    this.currentEmotionEffects.push(dustParticles);
    this.particleSystems.push(dustParticles);
  }

  private createPlayfulBubbles(): void {
    const bubbleGroup = new THREE.Group();
    const bubbleGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const bubbleMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6,
      specular: 0x111111
    });

    for (let i = 0; i < 20; i++) {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.set(
        Math.random() * 4 - 2,
        Math.random() * 2,
        Math.random() * 4 - 2
      );
      bubbleGroup.add(bubble);
    }
    this.scene.add(bubbleGroup);
    this.currentEmotionEffects.push(bubbleGroup);
    this.particleSystems.push(bubbleGroup);
  }

  private createAngerParticles(): void {
    const angerGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      const particle = this.createParticle(0xff0000);
      particle.position.set(
        Math.random() * 2 - 1,
        Math.random() * 2,
        Math.random() * 2 - 1
      );
      angerGroup.add(particle);
    }
    this.scene.add(angerGroup);
    this.currentEmotionEffects.push(angerGroup);
    this.particleSystems.push(angerGroup);
  }

  private createSparkleParticles(): void {
    const sparkleGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      const particle = this.createParticle(0xffff00);
      particle.position.set(
        Math.random() * 2 - 1,
        Math.random() * 2,
        Math.random() * 2 - 1
      );
      sparkleGroup.add(particle);
    }
    this.scene.add(sparkleGroup);
    this.currentEmotionEffects.push(sparkleGroup);
    this.particleSystems.push(sparkleGroup);
  }

  private createSleepZzz(): void {
    const zzzGroup = new THREE.Group();

    // Créer des Z plus organiques avec une animation
    for (let i = 0; i < 3; i++) {
      const zCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 0.3, 0),
        new THREE.Vector3(0.1, -0.3, 0),
        new THREE.Vector3(0.3, 0, 0)
      );

      const zGeometry = new THREE.TubeGeometry(zCurve, 20, 0.02, 8, false);
      const zMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
      });

      const zMesh = new THREE.Mesh(zGeometry, zMaterial);
      zMesh.position.set(
        0.5 + i * 0.4,
        1.8 - i * 0.1,
        1
      );
      zMesh.scale.set(0.8, 0.8, 0.8);

      // Animation flottante
      (zMesh as any).offset = Math.random() * Math.PI * 2;
      (zMesh as any).speed = 1 + Math.random() * 0.5;
      (zMesh as any).startY = zMesh.position.y;

      zzzGroup.add(zMesh);
    }

    this.scene.add(zzzGroup);
    this.currentEmotionEffects.push(zzzGroup);

    // Stocker la référence pour l'animation
    this.sleepZzzGroup = zzzGroup;
  }

  private createSimpleSleepZzz(): void {
    const zzzGroup = new THREE.Group();
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 3; i++) {
      const zGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.02);
      const zMesh = new THREE.Mesh(zGeometry, zMaterial);
      zMesh.position.set(
        0.5 + i * 0.3,
        1.5 + Math.random() * 0.2,
        1
      );
      zzzGroup.add(zMesh);
    }
    this.scene.add(zzzGroup);
    this.currentEmotionEffects.push(zzzGroup);
  }

  private createBasicFace(): void {
    const headGeometry = new THREE.SphereGeometry(1, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      specular: 0x111111,
      shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);

    const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.2, 0.9);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.2, 0.9);

    const mouthGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32, Math.PI);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x880000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.3, 0.9);
    mouth.rotation.x = Math.PI;

    this.scene.add(head, leftEye, rightEye, mouth);
    this.modelLoaded = true;
    this.loadingProgress = 100;
  }

  private cleanUp(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.clearEmotionEffects();

    if (this.faceModel) {
      this.scene.remove(this.faceModel);
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }

  private resetScene(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.renderer) {
      this.renderer.dispose();
      const canvas = this.renderer.domElement;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    this.scene = new THREE.Scene();
    this.facialBones = {};
    this.modelLoaded = false;
    this.loadingProgress = 0;

    if (this.canvasRef?.nativeElement) {
      const parent = this.canvasRef.nativeElement.parentNode;
      const newCanvas = this.canvasRef.nativeElement.cloneNode() as HTMLCanvasElement;
      parent?.replaceChild(newCanvas, this.canvasRef.nativeElement);
      this.canvasRef.nativeElement = newCanvas;
    }

    setTimeout(() => {
      try {
        this.initThreeJS();
        this.loadFaceModel();
      } catch (error) {
        console.error('Error resetting scene:', error);
        this.createBasicFace();
      }
    }, 100);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeThreeJS();
    });

    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }

  private resizeThreeJS(): void {
    if (!this.canvasRef?.nativeElement || !this.camera || !this.renderer) return;

    const width = this.canvasRef.nativeElement.clientWidth;
    const height = this.canvasRef.nativeElement.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private setWireframeMode(enabled: boolean): void {
    this.faceModel?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.wireframe = enabled;
            }
          });
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  private checkWebGLAvailability(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }


  private normalizeModelSize(): void {
    if (!this.faceModel) return;

    // Créer une boîte englobante pour le modèle
    const box = new THREE.Box3().setFromObject(this.faceModel);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    // Centrer le modèle
    this.faceModel.position.x = -center.x;
    this.faceModel.position.y = -center.y;
    this.faceModel.position.z = -center.z;

    // Ajuster la taille du modèle
    const targetSize = 20; // Taille cible pour le modèle
    const scale = targetSize / size;
    this.faceModel.scale.set(scale, scale, scale);

    console.log(`Model normalized - Scale factor: ${scale}`);
  }


  private logAvailableBones(): void {
    const bones: string[] = [];
    this.faceModel?.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
    });
    console.log('Bones available in model:', bones);
  }


}
