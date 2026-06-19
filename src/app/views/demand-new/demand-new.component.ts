import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-demand-new',
  standalone: true,
  templateUrl: './demand-new.component.html',
  styleUrls: ['./demand-new.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
  ],
})
export class DemandNewComponent {
  private fb = inject(FormBuilder);

  searchForm = this.fb.group({
    rut: ['', Validators.required],
  });

  // Estados vacíos reales: no mocks
  personLoaded = false;
  episodeLoaded = false;
  stageLoaded = false;

  readonly flowSteps = [
    'Persona',
    'Episodio',
    'Etapa por programa',
    'Eventos',
    'Referencias',
  ];

  readonly operativeActions = [
    {
      icon: 'event_available',
      title: 'Nueva citación',
      description:
        'Registrar fecha, hora, profesional y comentario de citación.',
      enabled: false,
    },
    {
      icon: 'how_to_reg',
      title: 'Registrar asistencia',
      description:
        'Marcar si se presentó, no se presentó, reprogramó o quedó pendiente.',
      enabled: false,
    },
    {
      icon: 'assignment',
      title: 'Entrevista / evaluación',
      description: 'Registrar evento clínico o social independiente.',
      enabled: false,
    },
    {
      icon: 'notes',
      title: 'Observación',
      description: 'Agregar observación general del episodio o etapa.',
      enabled: false,
    },
    {
      icon: 'sync_alt',
      title: 'Referir programa',
      description:
        'Cerrar etapa origen y crear etapa receptora sin reiniciar días.',
      enabled: false,
    },
    {
      icon: 'fact_check',
      title: 'Ingreso a tratamiento',
      description: 'Registrar ingreso efectivo y detener KPI de espera.',
      enabled: false,
    },
    {
      icon: 'logout',
      title: 'Egreso / cierre',
      description: 'Cerrar episodio con motivo, observación y auditoría.',
      enabled: false,
    },
  ];

  searchPerson(): void {
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid) return;

    // Por ahora no buscamos backend nuevo.
    // Se deja preparado para endpoint futuro Persona/Episodio.
    console.log(
      '[DemandNew] Buscar persona por RUN:',
      this.searchForm.getRawValue().rut,
    );
  }
}
