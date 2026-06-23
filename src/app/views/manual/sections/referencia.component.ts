import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-referencia',
  standalone: true,
  templateUrl: './referencia.component.html',
  styleUrls: ['../manual.shared.scss'],
  
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class ReferenciaComponent {}
