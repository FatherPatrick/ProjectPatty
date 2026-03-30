import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import {
  Color3,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  UniversalCamera,
  Vector3
} from '@babylonjs/core';

@Component({
  selector: 'app-game-scene',
  templateUrl: './game-scene.component.html',
  styleUrl: './game-scene.component.scss'
})
export class GameSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  private readonly renderCanvas!: ElementRef<HTMLCanvasElement>;

  private engine?: Engine;
  private scene?: Scene;
  private readonly pressedKeys = new Set<string>();

  constructor(private readonly ngZone: NgZone) {}

  public ngAfterViewInit(): void {
    const canvas = this.renderCanvas.nativeElement;

    this.engine = new Engine(canvas, true);
    this.scene = this.createScene(canvas);

    this.ngZone.runOutsideAngular(() => {
      this.engine?.runRenderLoop(() => {
        this.scene?.render();
      });
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.scene?.dispose();
    this.engine?.dispose();
  }

  private createScene(canvas: HTMLCanvasElement): Scene {
    const scene = new Scene(this.engine!);

    scene.clearColor.set(0.5, 0.7, 0.95, 1);

    const light = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    const ground = MeshBuilder.CreateGround('ground', { width: 120, height: 120, subdivisions: 150 }, scene);
    this.createRollingHills(ground);

    const groundMaterial = new StandardMaterial('groundMat', scene);
    groundMaterial.diffuseColor = new Color3(0.34, 0.6, 0.25);
    ground.material = groundMaterial;

    this.createRandomRocks(scene, ground);

    const player = this.createStickFigure(scene);
    player.position = new Vector3(0, 6, 0);

    const camera = new UniversalCamera('camera', new Vector3(0, 8, 10), scene);
    camera.attachControl(canvas, false);
    camera.inertia = 0;

    const speed = 0.09;
    scene.onBeforeRenderObservable.add(() => {
      this.updatePlayer(player, speed);
      const cameraOffset = new Vector3(0, 2, 2);
      camera.position = player.position.add(cameraOffset);
      camera.setTarget(player.position.add(new Vector3(0, 0.5, 0)));
    });

    return scene;
  }

  private createRollingHills(ground: Mesh): void {
    const positions = ground.getVerticesData('position');
    if (!positions) return;

    const newPositions = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const hillHeight =
        Math.sin(x * 0.05) * 4 +
        Math.cos(z * 0.05) * 4 +
        Math.sin((x + z) * 0.03) * 3 +
        Math.cos((x - z) * 0.04) * 2.5;

      newPositions[i] = x;
      newPositions[i + 1] = y + hillHeight;
      newPositions[i + 2] = z;
    }

    ground.updateVerticesData('position', newPositions);
    ground.createNormals(true);
  }

  private createRandomRocks(scene: Scene, ground: Mesh): void {
    const rockMaterial = new StandardMaterial('rockMat', scene);
    rockMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);

    const numRocks = 40;
    for (let i = 0; i < numRocks; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const scale = 0.3 + Math.random() * 0.8;
      
      const rock = MeshBuilder.CreateSphere('rock' + i, { diameter: scale, segments: 6 }, scene);
      
      const positions = ground.getVerticesData('position');
      if (positions) {
        const terrainHeight = this.getTerrainHeightAt(x, z);
        rock.position.set(x, terrainHeight + scale * 0.5, z);
      }
      
      rock.material = rockMaterial;
      rock.scaling.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
    }
  }

  private getTerrainHeightAt(x: number, z: number): number {
    return (
      Math.sin(x * 0.05) * 4 +
      Math.cos(z * 0.05) * 4 +
      Math.sin((x + z) * 0.03) * 3 +
      Math.cos((x - z) * 0.04) * 2.5
    );
  }

  private createStickFigure(scene: Scene): Mesh {
    const whiteMaterial = new StandardMaterial('stickMat', scene);
    whiteMaterial.diffuseColor = new Color3(1, 1, 1);

    const root = new Mesh('stickFigureRoot', scene);

    const head = MeshBuilder.CreateSphere('head', { diameter: 0.3, segments: 8 }, scene);
    head.position.y = 0.8;
    head.material = whiteMaterial;
    head.parent = root;

    const torso = MeshBuilder.CreateCylinder('torso', { height: 0.6, diameter: 0.2 }, scene);
    torso.position.y = 0.4;
    torso.material = whiteMaterial;
    torso.parent = root;

    const leftArm = MeshBuilder.CreateCylinder('leftArm', { height: 0.5, diameter: 0.08 }, scene);
    leftArm.position.set(-0.25, 0.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.material = whiteMaterial;
    leftArm.parent = root;

    const rightArm = MeshBuilder.CreateCylinder('rightArm', { height: 0.5, diameter: 0.08 }, scene);
    rightArm.position.set(0.25, 0.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.material = whiteMaterial;
    rightArm.parent = root;

    const leftLeg = MeshBuilder.CreateCylinder('leftLeg', { height: 0.6, diameter: 0.1 }, scene);
    leftLeg.position.set(-0.12, 0, 0);
    leftLeg.material = whiteMaterial;
    leftLeg.parent = root;

    const rightLeg = MeshBuilder.CreateCylinder('rightLeg', { height: 0.6, diameter: 0.1 }, scene);
    rightLeg.position.set(0.12, 0, 0);
    rightLeg.material = whiteMaterial;
    rightLeg.parent = root;

    return root;
  }

  private updatePlayer(player: Mesh, speed: number): void {
    let forwardAmount = 0;
    let rightAmount = 0;

    if (this.pressedKeys.has('w') || this.pressedKeys.has('arrowup')) {
      forwardAmount += 1;
    }
    if (this.pressedKeys.has('s') || this.pressedKeys.has('arrowdown')) {
      forwardAmount -= 1;
    }
    if (this.pressedKeys.has('a') || this.pressedKeys.has('arrowleft')) {
      rightAmount -= 1;
    }
    if (this.pressedKeys.has('d') || this.pressedKeys.has('arrowright')) {
      rightAmount += 1;
    }

    if (forwardAmount === 0 && rightAmount === 0) {
      return;
    }

    const forward = new Vector3(0, 0, -1);
    const right = new Vector3(-1, 0, 0);

    const direction = forward.scale(forwardAmount).add(right.scale(rightAmount));
    direction.normalize();

    player.position.addInPlace(direction.scale(speed));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }

  private readonly onResize = (): void => {
    this.engine?.resize();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.pressedKeys.add(event.key.toLowerCase());
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };
}