import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
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

    scene.clearColor.set(0.05, 0.08, 0.13, 1);

    const light = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    light.intensity = 0.95;

    const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, scene);
    const groundMaterial = new StandardMaterial('groundMat', scene);
    groundMaterial.diffuseColor = new Color3(0.11, 0.16, 0.2);
    ground.material = groundMaterial;

    const player = MeshBuilder.CreateCapsule(
      'player',
      { radius: 0.35, height: 1.8, tessellation: 12, capSubdivisions: 6 },
      scene
    );
    player.position = new Vector3(0, 0.9, 0);

    const playerMaterial = new StandardMaterial('playerMat', scene);
    playerMaterial.diffuseColor = new Color3(0.87, 0.28, 0.38);
    player.material = playerMaterial;

    const camera = new ArcRotateCamera('camera', Math.PI / 2, 1.1, 6, player.position, scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 3.5;
    camera.upperRadiusLimit = 9;
    camera.wheelPrecision = 35;
    camera.panningSensibility = 0;
    camera.lockedTarget = player;

    const speed = 0.09;
    scene.onBeforeRenderObservable.add(() => {
      this.updatePlayer(player, camera, speed);
    });

    return scene;
  }

  private updatePlayer(player: Mesh, camera: ArcRotateCamera, speed: number): void {
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

    const forward = new Vector3(Math.sin(camera.alpha), 0, Math.cos(camera.alpha)).normalize();
    const right = new Vector3(forward.z, 0, -forward.x).normalize();

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