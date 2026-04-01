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
  private routeBounds = { minX: -6, maxX: 16, minZ: -55, maxZ: 55 };
  private readonly tileSize = 8;
  private readonly tileCount = 30;
  private readonly portalEveryNTiles = 4;
  private readonly debugRefreshMs = 100;
  private lastDebugUpdateAt = 0;

  public pendingPortal: { label: string; url: string } | null = null;
  public debugPosition = { x: 0, y: 0, z: 0 };
  public debugVelocity = { x: 0, y: 0, z: 0 };

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
    this.sceneService.setupCamera(canvas);

    this.environmentService.setSkyColor(scene);
    this.environmentService.createTerrain(scene);
    this.environmentService.createRocks(scene);
    this.environmentService.createSidePathWithSign(scene);

    const routeTiles = this.portalService.generateRouteTiles(this.tileCount, this.tileSize);
    this.environmentService.createTileRoute(scene, routeTiles, this.tileSize);
    this.portalService.buildPortalSpawnsFromTiles(routeTiles, this.portalEveryNTiles);
    this.routeBounds = this.portalService.getRouteBoundsFromTiles(routeTiles, this.tileSize);

    this.portals = this.portalService.createPortals(scene);

    this.player = this.playerService.createPlayer(scene);
    this.updateDebugPosition(this.player, true);

    this.sceneService.startRenderLoop(this.ngZone, () => {
      if (this.player) {
        const { forward, right } = this.inputService.getMovementInput();
        const jumpPressed = this.inputService.isJumpPressed();
        
        this.playerService.updatePlayerMovement(this.player, forward, right);
        this.playerService.handleJumpInput(this.player, jumpPressed, forward, right);
        
        this.player.position.x = this.clamp(this.player.position.x, this.routeBounds.minX, this.routeBounds.maxX);
        this.player.position.z = this.clamp(this.player.position.z, this.routeBounds.minZ, this.routeBounds.maxZ);

        this.updateDebugPosition(this.player);

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

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private updateDebugPosition(player: Mesh, force: boolean = false): void {
    const now = performance.now();
    if (!force && now - this.lastDebugUpdateAt < this.debugRefreshMs) {
      return;
    }

    this.lastDebugUpdateAt = now;
    this.debugPosition = {
      x: Number(player.position.x.toFixed(2)),
      y: Number(player.position.y.toFixed(2)),
      z: Number(player.position.z.toFixed(2)),
    };
    const velocity = this.playerService.getPlayerVelocity(player);
    this.debugVelocity = {
      x: Number(velocity.x.toFixed(3)),
      y: Number(velocity.y.toFixed(3)),
      z: Number(velocity.z.toFixed(3)),
    };
    this.cdr.detectChanges();
  }
}