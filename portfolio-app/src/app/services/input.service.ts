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

  public isJumpPressed(): boolean {
    return this.pressedKeys.has(' ');
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
    const key = event.key.toLowerCase();
    this.pressedKeys.add(key);
    
    // Prevent default scroll behavior for spacebar and arrow keys
    if (key === ' ' || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.key.toLowerCase());
  }
}
