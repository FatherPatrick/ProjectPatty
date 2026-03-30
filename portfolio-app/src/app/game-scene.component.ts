import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesh } from '@babylonjs/core';
import { EnvironmentService } from './services/environment.service';
import { InputService } from './services/input.service';
import { PlayerService } from './services/player.service';
import { PortalService } from './services/portal.service';
import { SceneService } from './services/scene.service';

@Component({
  selector: 'app-game-scene',
  templateUrl: './game-scene.component.html',
  styleUrl: './game-scene.component.scss',
  imports: [CommonModule]
})
export class GameSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  private readonly renderCanvas!: ElementRef<HTMLCanvasElement>;

  private player?: Mesh;
  private portals: any[] = [];
  private lastTouchedPortal: any = null;

  public pendingPortal: { label: string; url: string } | null = null;

  constructor(
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly sceneService: SceneService,
    private readonly environmentService: EnvironmentService,
    private readonly playerService: PlayerService,
    private readonly inputService: InputService,
    private readonly portalService: PortalService
  ) {}

  public ngAfterViewInit(): void {
    const canvas = this.renderCanvas.nativeElement;

    this.sceneService.initializeEngine(canvas);
    const scene = this.sceneService.createScene();
    const camera = this.sceneService.setupCamera(canvas);

    this.environmentService.setSkyColor(scene);
    this.environmentService.createTerrain(scene);
    this.environmentService.createRocks(scene);

    this.portals = this.portalService.createPortals(scene);

    this.player = this.playerService.createPlayer(scene);

    this.sceneService.startRenderLoop(this.ngZone, () => {
      if (this.player) {
        const { forward, right } = this.inputService.getMovementInput();
        this.playerService.updatePlayerMovement(this.player, forward, right);
        this.player.position.y = 0.3;

        this.sceneService.updateCameraPosition(this.player);

        // Check for portal collisions
        const touchedPortal = this.portalService.checkPortalCollision(this.player.position);
        if (touchedPortal && touchedPortal !== this.lastTouchedPortal) {
          this.lastTouchedPortal = touchedPortal;
          this.pendingPortal = { label: touchedPortal.label, url: touchedPortal.url };
          this.cdr.detectChanges();
        } else if (!touchedPortal) {
          this.lastTouchedPortal = null;
        }
      }
    });

    window.addEventListener('resize', this.onResize);
  }

  public ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.inputService.cleanup();
    this.portalService.dispose();
    this.sceneService.dispose();
  }

  public confirmPortal(): void {
    if (this.pendingPortal) {
      window.open(this.pendingPortal.url, '_blank', 'noopener,noreferrer');
      this.pendingPortal = null;
    }
  }

  public dismissPortal(): void {
    this.pendingPortal = null;
  }

  private readonly onResize = (): void => {
    this.sceneService.handleResize();
  };
}