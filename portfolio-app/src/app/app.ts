import { Component } from '@angular/core';
import { GameSceneComponent } from './game-scene.component';

@Component({
  selector: 'app-root',
  imports: [GameSceneComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
