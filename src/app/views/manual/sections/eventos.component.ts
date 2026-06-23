import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-eventos',
  standalone: true,
  //host: { id: 'mantenedores' },
  templateUrl: './eventos.component.html',
  styleUrls: ['../manual.shared.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class EventosComponent {}
