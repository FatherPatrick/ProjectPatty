import { Injectable } from '@angular/core';
import { AbstractMesh, Color3, DynamicTexture, GlowLayer, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

export interface Portal {
  mesh: Mesh;
  url: string;
  label: string;
}

export interface PortalSpawn {
  position: Vector3;
  url: string;
  label: string;
  excerpt: string;
  color: Color3;
}

@Injectable({
  providedIn: 'root'
})
export class PortalService {
  private portals: Portal[] = [];
  private portalSigns: Mesh[] = [];
  private triggerIndicators: Mesh[] = [];
  private glowLayer?: GlowLayer;
  private readonly portalTriggerRadius = 3;
  private readonly portalSpawns: PortalSpawn[] = [
    { position: new Vector3(-5.5, 0, 46), url: 'https://www.linkedin.com/in/patty-park/', label: 'LinkedIn', excerpt: 'Patrick\'s LinkedIn profile.', color: new Color3(0.4, 0.9, 1) },
    { position: new Vector3(5.5, 0, 28), url: 'https://github.com/FatherPatrick', label: 'GitHub', excerpt: 'Patrick\'s GitHub profile.', color: new Color3(0.2, 0.6, 1) },
    { position: new Vector3(-5.5, 0, 10), url: 'https://tark-provision-calc.vercel.app/', label: 'Provision Calculator', excerpt: 'First side project. Frontend used to calculate most cost efficient way to replenish hunger and thirst in Tarkov.', color: new Color3(0.2, 1, 0.5) },
    { position: new Vector3(5.5, 0, -8), url: 'https://github.com/FatherPatrick/projectBinx', label: 'Project Binx', excerpt: 'App much like YikYak, but based on Polls.', color: new Color3(0, 0.5, 1) },
    { position: new Vector3(-5.5, 0, -26), url: 'https://tarkovle.vercel.app/', label: 'Tarkovle', excerpt: 'Wordle style game, but for Tarkov', color: new Color3(1, 0.5, 0.2) },
    { position: new Vector3(5.5, 0, -44), url: 'https://tarkovle.vercel.app/contact', label: 'Contact', excerpt: 'Reach out for collaboration or consulting.', color: new Color3(1, 0.2, 0.8) },
  ];

  public createPortals(scene: Scene): Portal[] {
    this.portals = [];
    this.portalSigns = [];
    this.triggerIndicators = [];
    this.glowLayer = new GlowLayer('glow', scene);

    this.portalSpawns.forEach((data) => {
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

      this.portalSigns.push(...this.createPortalSign(data, scene));
      this.triggerIndicators.push(...this.createTriggerIndicator(data.label, data.position, data.color, scene));

      if (this.glowLayer) {
        this.glowLayer.addIncludedOnlyMesh(portalMesh);
      }
    });

    return this.portals;
  }

  public getPortalSpawns(): PortalSpawn[] {
    return this.portalSpawns.map((spawn) => ({
      ...spawn,
      position: spawn.position.clone(),
      color: spawn.color.clone(),
    }));
  }

  public getRouteBounds(padding: number = 10): { minZ: number; maxZ: number } {
    const zValues = this.portalSpawns.map((spawn) => spawn.position.z);
    const minZ = Math.min(...zValues) - padding;
    const maxZ = Math.max(...zValues) + padding;
    return { minZ, maxZ };
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

  private createPortalSign(spawn: PortalSpawn, scene: Scene): Mesh[] {
    const { label, excerpt, position: portalPosition } = spawn;
    const signSide = portalPosition.x < 0 ? -1 : 1;
    const layout = this.getSignLayout(label, excerpt);
    const boardOffset = 0.8 + layout.boardWidth * 0.5;

    const board = MeshBuilder.CreatePlane(
      `portalSignBoard_${label}`,
      { width: layout.boardWidth, height: 1.3 },
      scene
    );
    board.position.set(portalPosition.x + signSide * boardOffset, 1.45, portalPosition.z);
    board.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;

    const texture = new DynamicTexture(
      `portalSignTexture_${label}`,
      { width: layout.textureWidth, height: 512 },
      scene,
      true
    );
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, layout.textureWidth, 512);
    context.strokeStyle = '#1e293b';
    context.lineWidth = 20;
    context.strokeRect(12, 12, layout.textureWidth - 24, 488);
    context.fillStyle = '#0f172a';
    context.font = 'bold 130px Segoe UI';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, layout.textureWidth * 0.5, 165);

    context.font = '52px Segoe UI';
    this.drawWrappedText(context, excerpt, layout.textureWidth * 0.5, 285, layout.textMaxWidth, 62, 3);
    texture.update();

    const boardMaterial = new StandardMaterial(`portalSignBoardMat_${label}`, scene);
    boardMaterial.diffuseTexture = texture;
    boardMaterial.emissiveTexture = texture;
    boardMaterial.disableLighting = true;
    boardMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    boardMaterial.backFaceCulling = false;
    board.material = boardMaterial;

    return [board];
  }

  private getSignLayout(label: string, excerpt: string): { boardWidth: number; textureWidth: number; textMaxWidth: number } {
    const baseBoardWidth = 2.8;
    const maxBoardWidth = 4.8;
    const overflowCharacters = Math.max(0, excerpt.length - 55);
    const labelOverflow = Math.max(0, label.length - 12);
    const boardWidth = this.clampNumber(
      baseBoardWidth + overflowCharacters * 0.022 + labelOverflow * 0.05,
      baseBoardWidth,
      maxBoardWidth
    );

    const textureWidth = Math.round((1024 * boardWidth) / baseBoardWidth);
    const textMaxWidth = textureWidth - 220;

    return { boardWidth, textureWidth, textMaxWidth };
  }

  private createTriggerIndicator(label: string, portalPosition: Vector3, color: Color3, scene: Scene): Mesh[] {
    const dashes: Mesh[] = [];
    const dashCount = 24;
    const dashLength = 0.45;
    const dashThickness = 0.07;

    const indicatorMaterial = new StandardMaterial(`portalTriggerMat_${label}`, scene);
    indicatorMaterial.emissiveColor = color.scale(0.7);
    indicatorMaterial.alpha = 0.9;
    indicatorMaterial.disableLighting = true;

    for (let i = 0; i < dashCount; i += 2) {
      const angle = (i / dashCount) * Math.PI * 2;
      const dash = MeshBuilder.CreateCylinder(
        `portalTrigger_${label}_${i}`,
        { height: dashLength, diameter: dashThickness, tessellation: 10 },
        scene
      );

      dash.position.set(
        portalPosition.x + Math.cos(angle) * this.portalTriggerRadius,
        0.08,
        portalPosition.z + Math.sin(angle) * this.portalTriggerRadius
      );

      // Rotate 90 degrees so each dash lies parallel to the ground.
      dash.rotation.z = Math.PI / 2;
      dash.rotation.y = angle;
      dash.material = indicatorMaterial;
      dashes.push(dash);
    }

    return dashes;
  }

  private drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }

      if (lines.length === maxLines) {
        break;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    if (words.length > 0 && lines.length === maxLines) {
      const renderedWordCount = lines.join(' ').split(' ').length;
      if (renderedWordCount < words.length) {
        lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.\s]+$/, '')}...`;
      }
    }

    lines.forEach((line, index) => {
      context.fillText(line, centerX, startY + index * lineHeight);
    });
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public dispose(): void {
    this.portals.forEach((p) => p.mesh.dispose());
    this.portalSigns.forEach((sign) => sign.dispose());
    this.triggerIndicators.forEach((indicator) => indicator.dispose());
    this.glowLayer?.dispose();
  }
}
