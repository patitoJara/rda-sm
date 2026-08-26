import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-flujo-demanda',
  standalone: true,
  templateUrl: './flujo-demanda.component.html',
  styleUrls: ['../manual.shared.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class FlujoDemandaComponent {}
