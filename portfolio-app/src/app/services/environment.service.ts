import { Injectable } from '@angular/core';
import { Color3, HemisphericLight, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

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
