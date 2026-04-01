import { Injectable } from '@angular/core';
import { AbstractMesh, Color3, DynamicTexture, GlowLayer, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

export type TileType = 'straight' | 'left' | 'right';

type RouteDirection = 0 | 1 | 2 | 3;

interface PortalTemplate {
  url: string;
  label: string;
  excerpt: string;
  color: Color3;
}

export interface Portal {
  mesh: Mesh;
  url: string;
  label: string;
}

export interface RouteTile {
  index: number;
  type: TileType;
  position: Vector3;
  rotationY: number;
  incomingDirection: RouteDirection;
  travelDirection: RouteDirection;
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
  private portalSpawns: PortalSpawn[] = [];
  private readonly portalTemplates: PortalTemplate[] = [
    { url: 'https://www.linkedin.com/in/patty-park/', label: 'LinkedIn', excerpt: 'Patrick\'s LinkedIn profile.', color: new Color3(0.4, 0.9, 1) },
    { url: 'https://github.com/FatherPatrick', label: 'GitHub', excerpt: 'Patrick\'s GitHub profile.', color: new Color3(0.2, 0.6, 1) },
    { url: 'https://tark-provision-calc.vercel.app/', label: 'Provision Calculator', excerpt: 'First side project. Frontend used to calculate most cost efficient way to replenish hunger and thirst in Tarkov.', color: new Color3(0.2, 1, 0.5) },
    { url: 'https://github.com/FatherPatrick/projectBinx', label: 'Project Binx', excerpt: 'App much like YikYak, but based on Polls.', color: new Color3(0, 0.5, 1) },
    { url: 'https://tarkovle.vercel.app/', label: 'Tarkovle', excerpt: 'Wordle style game, but for Tarkov', color: new Color3(1, 0.5, 0.2) },
    { url: 'https://tarkovle.vercel.app/contact', label: 'Contact', excerpt: 'Reach out for collaboration or consulting.', color: new Color3(1, 0.2, 0.8) },
  ];

  public generateRouteTiles(tileCount: number, tileSize: number, startPosition: Vector3 = new Vector3(0, 0, 50)): RouteTile[] {
    const clampedCount = Math.max(8, tileCount);
    const tiles: RouteTile[] = [];
    let direction: RouteDirection = 0;
    let currentPosition = startPosition.clone();
    const occupiedCells = new Set<string>();

    occupiedCells.add(this.gridKey(currentPosition, tileSize));

    for (let i = 0; i < clampedCount; i++) {
      const tileTypeOptions = this.getTileOptions(i);
      const selectedType = tileTypeOptions.find((option) => {
        const candidateDirection = this.rotateDirection(direction, option);
        const candidateNext = currentPosition.add(this.directionToStep(candidateDirection, tileSize));
        return !occupiedCells.has(this.gridKey(candidateNext, tileSize));
      }) ?? 'straight';

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
      const step = this.directionToStep(direction, tileSize);
      currentPosition = currentPosition.add(step);
      occupiedCells.add(this.gridKey(currentPosition, tileSize));
    }

    return tiles;
  }

  public buildPortalSpawnsFromTiles(tiles: RouteTile[], everyNTiles: number): PortalSpawn[] {
    const interval = Math.max(1, everyNTiles);
    const spawns: PortalSpawn[] = [];

    let templateIndex = 0;
    for (let i = interval - 1; i < tiles.length; i += interval) {
      const tile = tiles[i];
      const template = this.portalTemplates[templateIndex % this.portalTemplates.length];
      const side = templateIndex % 2 === 0 ? -1 : 1;
      const offset = this.getRightVector(tile.travelDirection).scale(side * 3.2);

      spawns.push({
        position: tile.position.add(offset),
        url: template.url,
        label: template.label,
        excerpt: template.excerpt,
        color: template.color.clone(),
      });

      templateIndex += 1;
    }

    this.portalSpawns = spawns;
    return this.getPortalSpawns();
  }

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
    if (this.portalSpawns.length === 0) {
      return { minZ: -padding, maxZ: padding };
    }

    const zValues = this.portalSpawns.map((spawn) => spawn.position.z);
    const minZ = Math.min(...zValues) - padding;
    const maxZ = Math.max(...zValues) + padding;
    return { minZ, maxZ };
  }

  public getRouteBoundsFromTiles(tiles: RouteTile[], padding: number = 12): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (tiles.length === 0) {
      return { minX: -padding, maxX: padding, minZ: -padding, maxZ: padding };
    }

    const xValues = tiles.map((tile) => tile.position.x);
    const zValues = tiles.map((tile) => tile.position.z);

    return {
      minX: Math.min(...xValues) - padding,
      maxX: Math.max(...xValues) + padding,
      minZ: Math.min(...zValues) - padding,
      maxZ: Math.max(...zValues) + padding,
    };
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

  private getTileOptions(index: number): TileType[] {
    if (index < 3) {
      return ['straight', 'left', 'right'];
    }

    const roll = Math.random();
    if (roll < 0.58) {
      return ['straight', 'left', 'right'];
    }

    if (roll < 0.79) {
      return ['left', 'straight', 'right'];
    }

    return ['right', 'straight', 'left'];
  }

  private rotateDirection(direction: RouteDirection, tileType: TileType): RouteDirection {
    if (tileType === 'left') {
      return ((direction + 3) % 4) as RouteDirection;
    }

    if (tileType === 'right') {
      return ((direction + 1) % 4) as RouteDirection;
    }

    return direction;
  }

  private getTileRotation(type: TileType, incomingDirection: RouteDirection): number {
    const rightAngle = Math.PI / 2;

    if (type === 'straight') {
      return incomingDirection % 2 === 0 ? 0 : rightAngle;
    }

    if (type === 'left') {
      return incomingDirection * rightAngle;
    }

    return incomingDirection * rightAngle;
  }

  private gridKey(position: Vector3, tileSize: number): string {
    const cellX = Math.round(position.x / tileSize);
    const cellZ = Math.round(position.z / tileSize);
    return `${cellX}:${cellZ}`;
  }

  private directionToStep(direction: RouteDirection, tileSize: number): Vector3 {
    switch (direction) {
      case 0:
        return new Vector3(0, 0, -tileSize);
      case 1:
        return new Vector3(tileSize, 0, 0);
      case 2:
        return new Vector3(0, 0, tileSize);
      default:
        return new Vector3(-tileSize, 0, 0);
    }
  }

  private getRightVector(direction: RouteDirection): Vector3 {
    switch (direction) {
      case 0:
        return new Vector3(1, 0, 0);
      case 1:
        return new Vector3(0, 0, 1);
      case 2:
        return new Vector3(-1, 0, 0);
      default:
        return new Vector3(0, 0, -1);
    }
  }

  public dispose(): void {
    this.portals.forEach((p) => p.mesh.dispose());
    this.portalSigns.forEach((sign) => sign.dispose());
    this.triggerIndicators.forEach((indicator) => indicator.dispose());
    this.glowLayer?.dispose();
  }
}
