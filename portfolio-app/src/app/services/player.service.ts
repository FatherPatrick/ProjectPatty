import { Injectable } from '@angular/core';
import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

interface PlayerAnimationState {
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
  phase: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly speed = 0.09;
  private readonly runCycleSpeed = 10;
  private readonly baseArmRotationX = Math.PI;
  private readonly armSwingAmount = 0.8;
  private readonly legSwingAmount = 1.0;

  public createPlayer(scene: Scene): Mesh {
    const player = this.createStickFigure(scene);
    player.position = new Vector3(0, 0, 50);
    return player;
  }

  public updatePlayerMovement(player: Mesh, forward: number, right: number): void {
    const isMoving = !(forward === 0 && right === 0);

    if (isMoving) {
      const forwardDir = new Vector3(0, 0, -1);
      const rightDir = new Vector3(-1, 0, 0);

      const direction = forwardDir.scale(forward).add(rightDir.scale(right));
      direction.normalize();

      player.position.addInPlace(direction.scale(this.speed));
      player.rotation.y = Math.atan2(direction.x, direction.z);
    }

    this.updateRunAnimation(player, isMoving);
  }

  private createStickFigure(scene: Scene): Mesh {
    const whiteMaterial = new StandardMaterial('stickMat', scene);
    whiteMaterial.diffuseColor = new Color3(1, 1, 1);

    const root = new Mesh('stickFigureRoot', scene);

    const head = MeshBuilder.CreateSphere('head', { diameter: 0.3, segments: 8 }, scene);
    head.position.y = 0.8;
    head.material = whiteMaterial;
    head.parent = root;
    this.createFaceMarker(scene, head);

    const torso = MeshBuilder.CreateCylinder('torso', { height: 0.6, diameter: 0.2 }, scene);
    torso.position.y = 0.4;
    torso.material = whiteMaterial;
    torso.parent = root;

    const leftArm = MeshBuilder.CreateCylinder('leftArm', { height: 0.5, diameter: 0.08 }, scene);
    leftArm.position.set(-0.25, 0.5, 0);
    leftArm.rotation.x = this.baseArmRotationX;
    leftArm.rotation.z = Math.PI / 4;
    leftArm.material = whiteMaterial;
    leftArm.parent = root;

    const rightArm = MeshBuilder.CreateCylinder('rightArm', { height: 0.5, diameter: 0.08 }, scene);
    rightArm.position.set(0.25, 0.5, 0);
    rightArm.rotation.x = this.baseArmRotationX;
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.material = whiteMaterial;
    rightArm.parent = root;

    const leftLeg = MeshBuilder.CreateCylinder('leftLeg', { height: 0.6, diameter: 0.1 }, scene);
    leftLeg.position.set(-0.12, 0, 0);
    leftLeg.material = whiteMaterial;
    leftLeg.parent = root;

    const rightLeg = MeshBuilder.CreateCylinder('rightLeg', { height: 0.6, diameter: 0.1 }, scene);
    rightLeg.position.set(0.12, 0, 0);
    rightLeg.material = whiteMaterial;
    rightLeg.parent = root;

    root.metadata = {
      animationState: {
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        phase: 0,
      } as PlayerAnimationState,
    };

    return root;
  }

  private updateRunAnimation(player: Mesh, isMoving: boolean): void {
    const state = this.getAnimationState(player);
    if (!state) {
      return;
    }

    const deltaSeconds = player.getScene().getEngine().getDeltaTime() / 1000;
    const smoothing = Math.min(1, deltaSeconds * 12);

    if (isMoving) {
      state.phase += deltaSeconds * this.runCycleSpeed;
      const swing = Math.sin(state.phase);
      const armTarget = this.baseArmRotationX + swing * this.armSwingAmount;
      const legTarget = swing * this.legSwingAmount;

      state.leftArm.rotation.x = this.lerp(state.leftArm.rotation.x, armTarget, smoothing);
      state.rightArm.rotation.x = this.lerp(state.rightArm.rotation.x, this.baseArmRotationX - swing * this.armSwingAmount, smoothing);
      state.leftLeg.rotation.x = this.lerp(state.leftLeg.rotation.x, -legTarget, smoothing);
      state.rightLeg.rotation.x = this.lerp(state.rightLeg.rotation.x, legTarget, smoothing);
      return;
    }

    state.leftArm.rotation.x = this.lerp(state.leftArm.rotation.x, this.baseArmRotationX, smoothing);
    state.rightArm.rotation.x = this.lerp(state.rightArm.rotation.x, this.baseArmRotationX, smoothing);
    state.leftLeg.rotation.x = this.lerp(state.leftLeg.rotation.x, 0, smoothing);
    state.rightLeg.rotation.x = this.lerp(state.rightLeg.rotation.x, 0, smoothing);
  }

  private getAnimationState(player: Mesh): PlayerAnimationState | undefined {
    const metadata = player.metadata as { animationState?: PlayerAnimationState } | undefined;
    return metadata?.animationState;
  }

  private createFaceMarker(scene: Scene, head: Mesh): void {
    const face = MeshBuilder.CreatePlane('faceMarker', { width: 0.2, height: 0.2 }, scene);
    face.position.set(0, 0, 0.185);
    face.rotation.z = -Math.PI / 2;
    face.parent = head;

    const texture = new DynamicTexture('faceMarkerTexture', { width: 256, height: 256 }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    context.clearRect(0, 0, 256, 256);
    context.fillStyle = '#000000';
    context.font = 'bold 140px Consolas';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(':)', 128, 132);

    texture.update();

    const faceMaterial = new StandardMaterial('faceMarkerMat', scene);
    faceMaterial.diffuseTexture = texture;
    faceMaterial.emissiveTexture = texture;
    faceMaterial.opacityTexture = texture;
    faceMaterial.useAlphaFromDiffuseTexture = true;
    faceMaterial.disableLighting = true;
    faceMaterial.backFaceCulling = false;
    face.material = faceMaterial;
  }

  private lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }
}
