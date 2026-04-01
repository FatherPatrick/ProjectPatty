import { Injectable } from '@angular/core';
import { Color3, HemisphericLight, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RouteTile } from './portal.service';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  public createTileRoute(scene: Scene, tiles: RouteTile[], tileSize: number): void {
    if (tiles.length === 0) {
      return;
    }

    // Slight overlap avoids tiny seams between adjacent tiles.
    const connectedTileSize = tileSize * 1.04;
    const laneMarkerWidth = 0.3;

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
      case 0:
        return new Vector3(0, 0, -1);
      case 1:
        return new Vector3(1, 0, 0);
      case 2:
        return new Vector3(0, 0, 1);
      default:
        return new Vector3(-1, 0, 0);
    }
  }

  public createTerrain(scene: Scene): Mesh {
    const light = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    const ground = MeshBuilder.CreateGround('ground', { width: 120, height: 120, subdivisions: 150 }, scene);
    this.createRollingHills(ground);

    const groundMaterial = new StandardMaterial('groundMat', scene);
    groundMaterial.diffuseColor = new Color3(0.34, 0.6, 0.25);
    ground.material = groundMaterial;

    return ground;
  }

  public createRocks(scene: Scene): void {
    const rockMaterial = new StandardMaterial('rockMat', scene);
    rockMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);

    const numRocks = 40;
    for (let i = 0; i < numRocks; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const scale = 0.3 + Math.random() * 0.8;

      const rock = MeshBuilder.CreateSphere('rock' + i, { diameter: scale, segments: 6 }, scene);
      rock.position.set(x, scale * 0.5, z);

      rock.material = rockMaterial;
      rock.scaling.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
    }
  }

  public createLinearRoute(scene: Scene, portalSpawns: Vector3[]): void {
    if (portalSpawns.length === 0) {
      return;
    }

    const zValues = portalSpawns.map((spawn) => spawn.z);
    const minZ = Math.min(...zValues) - 8;
    const maxZ = Math.max(...zValues) + 8;
    const routeLength = maxZ - minZ;
    const routeCenterZ = (maxZ + minZ) * 0.5;

    const route = MeshBuilder.CreateGround('linearRoute', { width: 14, height: routeLength, subdivisions: 1 }, scene);
    route.position.set(0, 0.03, routeCenterZ);

    const routeMaterial = new StandardMaterial('routeMat', scene);
    routeMaterial.diffuseColor = new Color3(0.2, 0.3, 0.2);
    routeMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    route.material = routeMaterial;

    const markerMaterial = new StandardMaterial('markerMat', scene);
    markerMaterial.diffuseColor = new Color3(0.8, 0.85, 0.45);

    portalSpawns.forEach((spawn, index) => {
      const marker = MeshBuilder.CreateCylinder(`routeMarker${index}`, { diameter: 1.8, height: 0.18, tessellation: 12 }, scene);
      marker.position.set(spawn.x, 0.1, spawn.z);
      marker.material = markerMaterial;
    });
  }

  public setSkyColor(scene: Scene): void {
    scene.clearColor.set(0.5, 0.7, 0.95, 1);
  }

  public createSidePathWithSign(scene: Scene): void {
    // Create a path going to the right from the main route
    const path = MeshBuilder.CreateGround('sidePath', { width: 4, height: 20, subdivisions: 1 }, scene);
    path.position.set(12, 0.03, 45);
    path.rotation.y = Math.PI / 2;

    const pathMaterial = new StandardMaterial('sidePathMat', scene);
    // Match the main route color exactly
    pathMaterial.diffuseColor = new Color3(0.2, 0.3, 0.2);
    pathMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    path.material = pathMaterial;

    // Create sign board with dynamic sizing
    const label = 'Patrick Park\'s Portfolio';
    const subtitle = 'Portfolio Experience';
    const layout = this.getSignLayoutForSidePath(label, subtitle);

    const signBoard = MeshBuilder.CreatePlane('projectPathSign', { width: layout.boardWidth, height: 1.3 }, scene);
    signBoard.position.set(16, 1.45, 45);
    signBoard.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // Create texture with dynamic sizing
    const texture = new DynamicTexture('projectSignTexture', { width: layout.textureWidth, height: 512 }, scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    
    // Light background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, layout.textureWidth, 512);
    
    // Dark border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 20;
    ctx.strokeRect(12, 12, layout.textureWidth - 24, 488);
    
    // Title text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 130px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, layout.textureWidth * 0.5, 165);
    
    // Subtitle text
    ctx.font = '52px Segoe UI';
    ctx.fillText(subtitle, layout.textureWidth * 0.5, 285);
    
    texture.update();

    const boardMaterial = new StandardMaterial('projecwatSignMat', scene);
    boardMaterial.diffuseTexture = texture;
    boardMaterial.emissiveTexture = texture;
    boardMaterial.disableLighting = true;
    boardMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    boardMaterial.backFaceCulling = false;
    signBoard.material = boardMaterial;
  }

  private getSignLayoutForSidePath(label: string, subtitle: string): { boardWidth: number; textureWidth: number } {
    const baseBoardWidth = 2.8;
    const maxBoardWidth = 5.8;
    const labelOverflow = Math.max(0, label.length - 0);
    const subtitleOverflow = Math.max(0, subtitle.length - 20);
    const boardWidth = this.clampNumber(
      baseBoardWidth + labelOverflow * 0.05 + subtitleOverflow * 0.03,
      baseBoardWidth,
      maxBoardWidth
    );

    const textureWidth = Math.round((1024 * boardWidth) / baseBoardWidth);

    return { boardWidth, textureWidth };
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public getTerrainHeightAt(x: number, z: number): number {
    return (
      Math.sin(x * 0.05) * 4 +
      Math.cos(z * 0.05) * 4 +
      Math.sin((x + z) * 0.03) * 3 +
      Math.cos((x - z) * 0.04) * 2.5
    );
  }

  private createRollingHills(ground: Mesh): void {
    const positions = ground.getVerticesData('position');
    if (!positions) return;

    const newPositions = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const hillHeight = this.getTerrainHeightAt(x, z);

      newPositions[i] = x;
      newPositions[i + 1] = y + hillHeight;
      newPositions[i + 2] = z;
    }

    ground.updateVerticesData('position', newPositions);
    ground.createNormals(true);
  }
}
