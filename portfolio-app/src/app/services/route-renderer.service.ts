import { Injectable } from '@angular/core';
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RouteTile } from './route.service';

@Injectable({
  providedIn: 'root',
})
export class RouteRendererService {
  public createTileRoute(scene: Scene, tiles: RouteTile[], tileSize: number): void {
    if (tiles.length === 0) {
      return;
    }

    const connectedTileSize = tileSize * 1.04;
    const laneMarkerWidth = 0.3;

    this.createPathBaseGround(scene, tiles, connectedTileSize);

    const tileMaterial = new StandardMaterial('tileRouteMat', scene);
    tileMaterial.diffuseColor = new Color3(0.24, 0.3, 0.24);
    tileMaterial.specularColor = new Color3(0.05, 0.05, 0.05);

    const markerMaterial = new StandardMaterial('tilePortalMarkerMat', scene);
    markerMaterial.diffuseColor = new Color3(0.86, 0.86, 0.52);
    markerMaterial.emissiveColor = new Color3(0.22, 0.2, 0.05);

    tiles.forEach((tile) => {
      const tileMesh = MeshBuilder.CreateGround(
        `routeTile_${tile.index}`,
        { width: connectedTileSize, height: connectedTileSize, subdivisions: 1 },
        scene
      );
      tileMesh.position.set(tile.position.x, 0.05, tile.position.z);
      tileMesh.rotation.y = tile.rotationY;
      tileMesh.material = tileMaterial;

      this.createTileLaneMarker(scene, tile, connectedTileSize, markerMaterial, laneMarkerWidth);
    });
  }

  public createEndMarker(scene: Scene, lastTile: RouteTile, tileSize: number): void {
    const forward = this.directionVector(lastTile.travelDirection);
    const signPosition = lastTile.position.add(forward.scale(tileSize * 0.55));

    const post = MeshBuilder.CreateCylinder('routeEndPost', { height: 1.8, diameter: 0.14, tessellation: 10 }, scene);
    post.position.set(signPosition.x, 0.9, signPosition.z);
    const postMaterial = new StandardMaterial('routeEndPostMat', scene);
    postMaterial.diffuseColor = new Color3(0.28, 0.21, 0.12);
    post.material = postMaterial;

    const board = MeshBuilder.CreatePlane('routeEndBoard', { width: 2.6, height: 1.1 }, scene);
    board.position.set(signPosition.x, 2.0, signPosition.z);
    board.billboardMode = Mesh.BILLBOARDMODE_Y;

    const texture = new DynamicTexture('routeEndTexture', { width: 1024, height: 420 }, scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1024, 420);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 18;
    ctx.strokeRect(10, 10, 1004, 400);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 170px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE END', 512, 215);
    texture.update();

    const boardMaterial = new StandardMaterial('routeEndBoardMat', scene);
    boardMaterial.diffuseTexture = texture;
    boardMaterial.emissiveTexture = texture;
    boardMaterial.disableLighting = true;
    boardMaterial.backFaceCulling = false;
    board.material = boardMaterial;
  }

  private createPathBaseGround(scene: Scene, tiles: RouteTile[], tileSize: number): void {
    const padding = tileSize * 1.2;
    const xValues = tiles.map((tile) => tile.position.x);
    const zValues = tiles.map((tile) => tile.position.z);
    const minX = Math.min(...xValues) - padding;
    const maxX = Math.max(...xValues) + padding;
    const minZ = Math.min(...zValues) - padding;
    const maxZ = Math.max(...zValues) + padding;

    const width = maxX - minX;
    const height = maxZ - minZ;
    const centerX = (minX + maxX) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;

    const pathBase = MeshBuilder.CreateGround('routePathBaseGround', { width, height, subdivisions: 1 }, scene);
    pathBase.position.set(centerX, 0.02, centerZ);

    const pathBaseMaterial = new StandardMaterial('routePathBaseMat', scene);
    pathBaseMaterial.diffuseColor = new Color3(0.34, 0.6, 0.25);
    pathBaseMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    pathBase.material = pathBaseMaterial;
  }

  private createTileLaneMarker(
    scene: Scene,
    tile: RouteTile,
    tileSize: number,
    markerMaterial: StandardMaterial,
    markerWidth: number
  ): void {
    const inVec = this.directionVector(tile.incomingDirection);
    const outVec = this.directionVector(tile.travelDirection);
    const half = tileSize * 0.5;

    if (tile.type === 'straight') {
      const start = tile.position.subtract(inVec.scale(half));
      const end = tile.position.add(outVec.scale(half));
      const straightPath = [
        start.add(new Vector3(0, 0.09, 0)),
        end.add(new Vector3(0, 0.09, 0)),
      ];
      const laneMarker = MeshBuilder.CreateTube(
        `routeTileLane_${tile.index}`,
        { path: straightPath, radius: markerWidth * 0.5, tessellation: 12, cap: Mesh.CAP_ALL },
        scene
      );
      laneMarker.material = markerMaterial;
      return;
    }

    const right = new Vector3(-inVec.z, 0, inVec.x);
    const turnSide = tile.type === 'right' ? 1 : -1;
    const center = tile.position.add(right.scale(turnSide * half)).subtract(inVec.scale(half));
    const start = tile.position.subtract(inVec.scale(half));
    const end = tile.position.add(outVec.scale(half));

    const startRadiusVector = start.subtract(center);
    const endRadiusVector = end.subtract(center);
    const startLength = Math.max(0.0001, Math.sqrt(startRadiusVector.x * startRadiusVector.x + startRadiusVector.z * startRadiusVector.z));
    const endLength = Math.max(0.0001, Math.sqrt(endRadiusVector.x * endRadiusVector.x + endRadiusVector.z * endRadiusVector.z));
    const startDir = startRadiusVector.scale(1 / startLength);
    const endDir = endRadiusVector.scale(1 / endLength);

    const points: Vector3[] = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * (Math.PI / 2);
      const dir = startDir.scale(Math.cos(angle)).add(endDir.scale(Math.sin(angle)));
      points.push(center.add(dir.scale(half)).add(new Vector3(0, 0.09, 0)));
    }

    const laneCurve = MeshBuilder.CreateTube(
      `routeTileLane_${tile.index}`,
      { path: points, radius: markerWidth * 0.5, tessellation: 12, cap: Mesh.CAP_ALL },
      scene
    );
    laneCurve.material = markerMaterial;
  }

  private directionVector(direction: number): Vector3 {
    switch (direction) {
      case 0: return new Vector3(0, 0, -1);
      case 1: return new Vector3(1, 0, 0);
      case 2: return new Vector3(0, 0, 1);
      default: return new Vector3(-1, 0, 0);
    }
  }
}
