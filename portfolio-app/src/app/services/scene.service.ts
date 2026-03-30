import { Injectable } from '@angular/core';
import { Engine, Mesh, Scene, UniversalCamera, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class SceneService {
  private engine?: Engine;
  private scene?: Scene;
  private camera?: UniversalCamera;

  public initializeEngine(canvas: HTMLCanvasElement): void {
    this.engine = new Engine(canvas, true);
  }

  public createScene(): Scene {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }
    this.scene = new Scene(this.engine);
    return this.scene;
  }

  public setupCamera(canvas: HTMLCanvasElement): UniversalCamera {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    this.camera = new UniversalCamera('camera', new Vector3(0, 8, 10), this.scene);
    this.camera.attachControl(canvas, false);
    this.camera.inertia = 0;
    return this.camera;
  }

  public updateCameraPosition(player: Mesh): void {
    if (!this.camera) return;
    const cameraOffset = new Vector3(0, 3, 10);
    this.camera.position = player.position.add(cameraOffset);
    this.camera.setTarget(player.position.add(new Vector3(0, 0.5, 0)));
  }

  public startRenderLoop(ngZone: any, onRender: () => void): void {
    if (!this.engine || !this.scene) return;
    ngZone.runOutsideAngular(() => {
      this.engine?.runRenderLoop(() => {
        this.scene?.render();
        onRender();
      });
    });
  }

  public handleResize(): void {
    this.engine?.resize();
  }

  public dispose(): void {
    this.scene?.dispose();
    this.engine?.dispose();
  }

  public getScene(): Scene | undefined {
    return this.scene;
  }

  public getEngine(): Engine | undefined {
    return this.engine;
  }
}
