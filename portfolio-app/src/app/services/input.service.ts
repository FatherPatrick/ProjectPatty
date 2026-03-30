import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private readonly pressedKeys = new Set<string>();

  constructor() {
    this.setupEventListeners();
  }

  public getMovementInput(): { forward: number; right: number } {
    let forward = 0;
    let right = 0;

    if (this.pressedKeys.has('w') || this.pressedKeys.has('arrowup')) {
      forward += 1;
    }
    if (this.pressedKeys.has('s') || this.pressedKeys.has('arrowdown')) {
      forward -= 1;
    }
    if (this.pressedKeys.has('a') || this.pressedKeys.has('arrowleft')) {
      right -= 1;
    }
    if (this.pressedKeys.has('d') || this.pressedKeys.has('arrowright')) {
      right += 1;
    }

    return { forward, right };
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  public cleanup(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.pressedKeys.add(event.key.toLowerCase());
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.key.toLowerCase());
  }
}
