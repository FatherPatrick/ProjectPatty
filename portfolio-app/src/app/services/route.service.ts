import { Injectable } from '@angular/core';
import { Mesh, Vector3 } from '@babylonjs/core';

export type TileType = 'straight' | 'left' | 'right';
export type RouteDirection = 0 | 1 | 2 | 3;

export interface RouteTile {
  index: number;
  type: TileType;
  position: Vector3;
  rotationY: number;
  incomingDirection: RouteDirection;
  travelDirection: RouteDirection;
}

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  private tiles: RouteTile[] = [];

  public generateRouteTiles(
    tileCount: number,
    tileSize: number,
    startPosition: Vector3 = new Vector3(0, 0, 50)
  ): RouteTile[] {
    const clampedCount = Math.max(8, tileCount);
    const tiles: RouteTile[] = [];
    let direction: RouteDirection = 0;
    let currentPosition = startPosition.clone();
    let previousTileType: TileType | undefined;
    const occupiedCells = new Set<string>();

    occupiedCells.add(this.gridKey(currentPosition, tileSize));

    for (let i = 0; i < clampedCount; i++) {
      const tileTypeOptions = this.getTileOptions(i, previousTileType);
      const selectedType =
        tileTypeOptions.find((option) => {
          const candidateDirection = this.rotateDirection(direction, option);
          if (this.isPositiveZDirection(candidateDirection)) {
            return false;
          }
          const candidateNext = currentPosition.add(this.directionToStep(candidateDirection, tileSize));
          return !occupiedCells.has(this.gridKey(candidateNext, tileSize));
        }) ??
        tileTypeOptions.find((option) => !this.isPositiveZDirection(this.rotateDirection(direction, option))) ??
        'left';

      const outgoingDirection = this.rotateDirection(direction, selectedType);

      tiles.push({
        index: i,
        type: selectedType,
        position: currentPosition.clone(),
        rotationY: this.getTileRotation(selectedType, direction),
        incomingDirection: direction,
        travelDirection: outgoingDirection,
      });

      direction = outgoingDirection;
      previousTileType = selectedType;
      const step = this.directionToStep(direction, tileSize);
      currentPosition = currentPosition.add(step);
      occupiedCells.add(this.gridKey(currentPosition, tileSize));
    }

    this.tiles = tiles;
    return tiles;
  }

  public getTiles(): RouteTile[] {
    return this.tiles;
  }

  public getRouteBoundsFromTiles(tileSize: number, padding: number = 12): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (this.tiles.length === 0) {
      return { minX: -padding, maxX: padding, minZ: -padding, maxZ: padding };
    }

    const xValues = this.tiles.map((tile) => tile.position.x);
    const zValues = this.tiles.map((tile) => tile.position.z);

    return {
      minX: Math.min(...xValues) - padding,
      maxX: Math.max(...xValues) + padding,
      minZ: Math.min(...zValues) - padding,
      maxZ: Math.max(...zValues) + padding,
    };
  }

  public constrainPlayerToPath(player: Mesh, tileSize: number): void {
    if (this.tiles.length === 0) {
      return;
    }

    const point = { x: player.position.x, z: player.position.z };
    const tileHalfSize = tileSize * 1.04 * 0.5;
    let bestPoint = point;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (const tile of this.tiles) {
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

    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    const clampedX = this.clamp(localX, -tileHalfSize, tileHalfSize);
    const clampedZ = this.clamp(localZ, -tileHalfSize, tileHalfSize);
    const isInside = localX === clampedX && localZ === clampedZ;

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

  private getTileOptions(index: number, previousTileType?: TileType): TileType[] {
    const removeConsecutiveSameTurn = (options: TileType[]): TileType[] => {
      if (previousTileType === 'left') return options.filter((o) => o !== 'left');
      if (previousTileType === 'right') return options.filter((o) => o !== 'right');
      return options;
    };

    if (index < 3) {
      return removeConsecutiveSameTurn(['straight', 'left', 'right']);
    }

    const roll = Math.random();
    if (roll < 0.58) return removeConsecutiveSameTurn(['straight', 'left', 'right']);
    if (roll < 0.79) return removeConsecutiveSameTurn(['left', 'straight', 'right']);
    return removeConsecutiveSameTurn(['right', 'straight', 'left']);
  }

  private rotateDirection(direction: RouteDirection, tileType: TileType): RouteDirection {
    if (tileType === 'left') return ((direction + 3) % 4) as RouteDirection;
    if (tileType === 'right') return ((direction + 1) % 4) as RouteDirection;
    return direction;
  }

  private getTileRotation(type: TileType, incomingDirection: RouteDirection): number {
    const rightAngle = Math.PI / 2;
    if (type === 'straight') return incomingDirection % 2 === 0 ? 0 : rightAngle;
    return incomingDirection * rightAngle;
  }

  private gridKey(position: Vector3, tileSize: number): string {
    const cellX = Math.round(position.x / tileSize);
    const cellZ = Math.round(position.z / tileSize);
    return `${cellX}:${cellZ}`;
  }

  private directionToStep(direction: RouteDirection, tileSize: number): Vector3 {
    switch (direction) {
      case 0: return new Vector3(0, 0, -tileSize);
      case 1: return new Vector3(tileSize, 0, 0);
      case 2: return new Vector3(0, 0, tileSize);
      default: return new Vector3(-tileSize, 0, 0);
    }
  }

  private isPositiveZDirection(direction: RouteDirection): boolean {
    return direction === 2;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
