import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { EnvironmentService } from './services/environment.service';
import { InputService } from './services/input.service';
import { PlayerService } from './services/player.service';
import { SceneService } from './services/scene.service';

@Component({
  selector: 'app-game-scene',
  templateUrl: './game-scene.component.html',
  styleUrl: './game-scene.component.scss'
})
export class GameSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  private readonly renderCanvas!: ElementRef<HTMLCanvasElement>;

  private player?: Mesh;

  constructor(
    private readonly ngZone: NgZone,
    private readonly sceneService: SceneService,
    private readonly environmentService: EnvironmentService,
    private readonly playerService: PlayerService,
    private readonly inputService: InputService
  ) {}

  public ngAfterViewInit(): void {
    const canvas = this.renderCanvas.nativeElement;

    this.sceneService.initializeEngine(canvas);
    const scene = this.sceneService.createScene();
    const camera = this.sceneService.setupCamera(canvas);

    this.environmentService.setSkyColor(scene);
    this.environmentService.createTerrain(scene);
    this.environmentService.createRocks(scene);

    this.player = this.playerService.createPlayer(scene);

    this.sceneService.startRenderLoop(this.ngZone, () => {
      if (this.player) {
        const { forward, right } = this.inputService.getMovementInput();
        this.playerService.updatePlayerMovement(this.player, forward, right);
        this.sceneService.updateCameraPosition(this.player);
      }
    });

    window.addEventListener('resize', this.onResize);
  }

  public ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.inputService.cleanup();
    this.sceneService.dispose();
  }

  private readonly onResize = (): void => {
    this.sceneService.handleResize();
  };
}