import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesh } from '@babylonjs/core';
import { EnvironmentService } from './services/environment.service';
import { InputService } from './services/input.service';
import { PlayerService } from './services/player.service';
import { PortalService, RouteTile } from './services/portal.service';
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
  private routeTiles: RouteTile[] = [];
  private lastTouchedPortal: any = null;
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

    this.routeTiles = this.portalService.generateRouteTiles(this.tileCount, this.tileSize);
    this.environmentService.createTileRoute(scene, this.routeTiles, this.tileSize);
    const lastTile = this.routeTiles[this.routeTiles.length - 1];
    if (lastTile) {
      this.environmentService.createEndMarker(scene, lastTile, this.tileSize);
    }
    this.portalService.buildPortalSpawnsFromTiles(this.routeTiles, this.portalEveryNTiles);

    this.portals = this.portalService.createPortals(scene);

    this.player = this.playerService.createPlayer(scene);
    this.updateDebugPosition(this.player, true);

    this.sceneService.startRenderLoop(this.ngZone, () => {
      if (this.player) {
        const { forward, right } = this.inputService.getMovementInput();
        const jumpPressed = this.inputService.isJumpPressed();
        
        this.playerService.updatePlayerMovement(this.player, forward, right);
        this.playerService.handleJumpInput(this.player, jumpPressed, forward, right);

        this.constrainPlayerToPath(this.player);

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

  private constrainPlayerToPath(player: Mesh): void {
    if (this.routeTiles.length === 0) {
      return;
    }

    const point = { x: player.position.x, z: player.position.z };
    const tileHalfSize = this.tileSize * 1.04 * 0.5;
    let bestPoint = point;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (const tile of this.routeTiles) {
      const nearest = this.closestPointOnTile(point, tile, tileHalfSize);
      if (nearest.isInside) {
        return;
      }

      if (nearest.distanceSq < bestDistanceSq) {
        bestDistanceSq = nearest.distanceSq;
        bestPoint = nearest.point;
      }
    }

    player.position.x = bestPoint.x;
    player.position.z = bestPoint.z;
  }

  private closestPointOnTile(
    point: { x: number; z: number },
    tile: RouteTile,
    tileHalfSize: number
  ): { point: { x: number; z: number }; distanceSq: number; isInside: boolean } {
    const dx = point.x - tile.position.x;
    const dz = point.z - tile.position.z;
    const cos = Math.cos(tile.rotationY);
    const sin = Math.sin(tile.rotationY);

    // Rotate into tile-local space.
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    const clampedX = this.clamp(localX, -tileHalfSize, tileHalfSize);
    const clampedZ = this.clamp(localZ, -tileHalfSize, tileHalfSize);
    const isInside = localX === clampedX && localZ === clampedZ;

    // Rotate clamped local point back to world space.
    const worldX = tile.position.x + clampedX * cos - clampedZ * sin;
    const worldZ = tile.position.z + clampedX * sin + clampedZ * cos;
    const ddx = point.x - worldX;
    const ddz = point.z - worldZ;

    return {
      point: { x: worldX, z: worldZ },
      distanceSq: ddx * ddx + ddz * ddz,
      isInside,
    };
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