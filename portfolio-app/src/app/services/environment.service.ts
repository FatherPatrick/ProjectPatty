import { Injectable } from '@angular/core';
import { Color3, HemisphericLight, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
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

  public setSkyColor(scene: Scene): void {
    scene.clearColor.set(0.5, 0.7, 0.95, 1);

    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = new Color3(0.5, 0.7, 0.95);
    scene.fogStart = 22;
    scene.fogEnd = 115;
  }

  public createSidePathWithSign(scene: Scene): void {
    const path = MeshBuilder.CreateGround('sidePath', { width: 4, height: 20, subdivisions: 1 }, scene);
    path.position.set(12, 0.03, 45);
    path.rotation.y = Math.PI / 2;

    const pathMaterial = new StandardMaterial('sidePathMat', scene);
    pathMaterial.diffuseColor = new Color3(0.2, 0.3, 0.2);
    pathMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    path.material = pathMaterial;

    const label = "Patrick Park's Portfolio";
    const subtitle = 'Portfolio Experience';
    const layout = this.getSignLayoutForSidePath(label, subtitle);

    const signBoard = MeshBuilder.CreatePlane('projectPathSign', { width: layout.boardWidth, height: 1.3 }, scene);
    signBoard.position.set(16, 1.45, 45);
    signBoard.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const texture = new DynamicTexture('projectSignTexture', { width: layout.textureWidth, height: 512 }, scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, layout.textureWidth, 512);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 20;
    ctx.strokeRect(12, 12, layout.textureWidth - 24, 488);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 130px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, layout.textureWidth * 0.5, 165);

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

  public getTerrainHeightAt(x: number, z: number): number {
    return (
      Math.sin(x * 0.05) * 4 +
      Math.cos(z * 0.05) * 4 +
      Math.sin((x + z) * 0.03) * 3 +
      Math.cos((x - z) * 0.04) * 2.5
    );
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
