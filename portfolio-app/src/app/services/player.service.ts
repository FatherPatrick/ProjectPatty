import { Injectable } from '@angular/core';
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly speed = 0.09;

  public createPlayer(scene: Scene): Mesh {
    const player = this.createStickFigure(scene);
    player.position = new Vector3(0, 6, 0);
    return player;
  }

  public updatePlayerMovement(player: Mesh, forward: number, right: number): void {
    if (forward === 0 && right === 0) {
      return;
    }

    const forwardDir = new Vector3(0, 0, -1);
    const rightDir = new Vector3(-1, 0, 0);

    const direction = forwardDir.scale(forward).add(rightDir.scale(right));
    direction.normalize();

    player.position.addInPlace(direction.scale(this.speed));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }

  private createStickFigure(scene: Scene): Mesh {
    const whiteMaterial = new StandardMaterial('stickMat', scene);
    whiteMaterial.diffuseColor = new Color3(1, 1, 1);

    const root = new Mesh('stickFigureRoot', scene);

    const head = MeshBuilder.CreateSphere('head', { diameter: 0.3, segments: 8 }, scene);
    head.position.y = 0.8;
    head.material = whiteMaterial;
    head.parent = root;

    const torso = MeshBuilder.CreateCylinder('torso', { height: 0.6, diameter: 0.2 }, scene);
    torso.position.y = 0.4;
    torso.material = whiteMaterial;
    torso.parent = root;

    const leftArm = MeshBuilder.CreateCylinder('leftArm', { height: 0.5, diameter: 0.08 }, scene);
    leftArm.position.set(-0.25, 0.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.material = whiteMaterial;
    leftArm.parent = root;

    const rightArm = MeshBuilder.CreateCylinder('rightArm', { height: 0.5, diameter: 0.08 }, scene);
    rightArm.position.set(0.25, 0.5, 0);
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

    return root;
  }
}
