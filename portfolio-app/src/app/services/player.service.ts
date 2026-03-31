import { Injectable } from '@angular/core';
import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3, Matrix } from '@babylonjs/core';

interface PlayerAnimationState {
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
  phase: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  jumpVelocityZ: number;
  isGrounded: boolean;
  lastJumpTime: number;
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
  private readonly gravity = 0.015;
  private readonly jumpForce = 0.25;
  private readonly jumpForwardVelocity = 0.08;
  private readonly groundHeight = 0.3;
  private readonly jumpCooldown = 0.3;

  public createPlayer(scene: Scene): Mesh {
    const player = this.createStickFigure(scene);
    player.position = new Vector3(0, 0, 50);
    return player;
  }

  public updatePlayerMovement(player: Mesh, forward: number, right: number): void {
    const isMoving = !(forward === 0 && right === 0);
    const state = this.getAnimationState(player);

    if (!state) return;

    if (isMoving) {
      const forwardDir = new Vector3(0, 0, -1);
      const rightDir = new Vector3(-1, 0, 0);

      const direction = forwardDir.scale(forward).add(rightDir.scale(right));
      direction.normalize();

      player.position.addInPlace(direction.scale(this.speed));
      player.rotation.y = Math.atan2(direction.x, direction.z);

      // Track actual applied velocity
      state.velocityX = direction.x * this.speed;
      state.velocityZ = direction.z * this.speed;
    } else {
      state.velocityX = 0;
      state.velocityZ = 0;
    }

    // Apply jump velocity (decays each frame)
    if (Math.abs(state.jumpVelocityZ) > 0.001) {
      const forwardDir = new Vector3(0, 0, 1);
      const rotationMatrix = Matrix.RotationY(player.rotation.y);
      const rotatedForward = Vector3.TransformCoordinates(forwardDir, rotationMatrix);
      player.position.addInPlace(rotatedForward.scale(state.jumpVelocityZ));
      state.jumpVelocityZ *= 0.95; // Decay jump velocity
    } else {
      state.jumpVelocityZ = 0;
    }

    this.updateRunAnimation(player, isMoving);
    this.applyGravity(player);
  }

  public handleJumpInput(player: Mesh, jumpPressed: boolean, forward: number = 0, right: number = 0): void {
    const state = this.getAnimationState(player);
    if (!state || !jumpPressed) {
      return;
    }

    const isMoving = !(forward === 0 && right === 0);
    const currentTime = performance.now() / 1000;
    if (state.isGrounded && currentTime - state.lastJumpTime >= this.jumpCooldown) {
      state.velocityY = this.jumpForce;
      // Only apply forward velocity from jump if the player is moving
      state.jumpVelocityZ = isMoving ? this.jumpForwardVelocity : 0;
      state.isGrounded = false;
      state.lastJumpTime = currentTime;
    }
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
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        jumpVelocityZ: 0,
        isGrounded: true,
        lastJumpTime: 0,
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

  private applyGravity(player: Mesh): void {
    const state = this.getAnimationState(player);
    if (!state) {
      return;
    }

    // Apply gravity
    state.velocityY -= this.gravity;

    // Update position
    player.position.y += state.velocityY;

    // Check if grounded
    if (player.position.y <= this.groundHeight) {
      player.position.y = this.groundHeight;
      state.velocityY = 0;
      state.isGrounded = true;
    }
  }

  public getPlayerVelocity(player: Mesh): { x: number; y: number; z: number } {
    const state = this.getAnimationState(player);
    if (!state) {
      return { x: 0, y: 0, z: 0 };
    }
    return { x: state.velocityX, y: state.velocityY, z: state.velocityZ + state.jumpVelocityZ };
  }
}
