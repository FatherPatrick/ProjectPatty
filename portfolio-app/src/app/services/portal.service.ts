import { Injectable } from '@angular/core';
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3, GlowLayer } from '@babylonjs/core';

export interface Portal {
  mesh: Mesh;
  url: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class PortalService {
  private portals: Portal[] = [];
  private glowLayer?: GlowLayer;

  public createPortals(scene: Scene): Portal[] {
    this.glowLayer = new GlowLayer('glow', scene);

    const portalData = [
      { position: new Vector3(15, 0, 15), url: 'https://linkedin.com', label: 'GitHub', color: new Color3(0.2, 0.6, 1) },
      { position: new Vector3(-15, 0, 15), url: 'https://linkedin.com', label: 'Twitter', color: new Color3(0.1, 0.7, 1) },
      { position: new Vector3(15, 0, -15), url: 'https://linkedin.com', label: 'LinkedIn', color: new Color3(0, 0.5, 1) },
      { position: new Vector3(-15, 0, -15), url: 'https://linkedin.com', label: 'Portfolio', color: new Color3(1, 0.2, 0.8) },
      { position: new Vector3(25, 0, 0), url: 'https://linkedin.com', label: 'Blog', color: new Color3(1, 0.5, 0.2) },
      { position: new Vector3(-25, 0, 0), url: 'https://linkedin.com', label: 'Projects', color: new Color3(0.2, 1, 0.5) },
    ];

    portalData.forEach((data) => {
      const portalMesh = this.createPortalMesh(
        data.label,
        new Vector3(data.position.x, 1, data.position.z),
        data.color,
        scene
      );

      this.portals.push({
        mesh: portalMesh,
        url: data.url,
        label: data.label
      });

      if (this.glowLayer) {
        this.glowLayer.addIncludedOnlyMesh(portalMesh);
      }
    });

    return this.portals;
  }

  public getPortals(): Portal[] {
    return this.portals;
  }

  public checkPortalCollision(playerPos: Vector3, radius: number = 3): Portal | null {
    for (const portal of this.portals) {
      const dx = playerPos.x - portal.mesh.position.x;
      const dz = playerPos.z - portal.mesh.position.z;
      const xzDistance = Math.sqrt(dx * dx + dz * dz);
      if (xzDistance < radius) {
        return portal;
      }
    }
    return null;
  }

  public activatePortal(_portal: Portal): void {
    // Activation is handled by the component modal
  }

  private createPortalMesh(name: string, position: Vector3, color: Color3, scene: Scene): Mesh {
    const portal = MeshBuilder.CreateTorus(`portal_${name}`, { diameter: 2, thickness: 0.3, tessellation: 16 }, scene);
    portal.position = position;

    const portalMaterial = new StandardMaterial(`portalMat_${name}`, scene);
    portalMaterial.emissiveColor = color;
    portalMaterial.alpha = 0.9;
    portal.material = portalMaterial;

    // Rotate to stand upright
    portal.rotation.x = Math.PI / 2;

    // Add rotation animation
    let rotationAngle = 0;
    scene.onBeforeRenderObservable.add(() => {
      rotationAngle += 0.01;
      portal.rotation.z = rotationAngle;
    });

    return portal;
  }

  public dispose(): void {
    this.portals.forEach((p) => p.mesh.dispose());
    this.glowLayer?.dispose();
  }
}
