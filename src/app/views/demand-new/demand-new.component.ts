import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { finalize } from 'rxjs/operators';
import { PostulantService } from '@app/services/postulant.service';
import { Postulant } from '@app/models/postulant';

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
  private postulantService = inject(PostulantService);

  searchForm = this.fb.group({
    rut: ['', Validators.required],
  });

  personForm = this.fb.group({
    rut: [{ value: '', disabled: true }],
    firstName: [''],
    secondName: [''],
    firstLastName: [''],
    secondLastName: [''],
    birthDate: [''],
    sex: [''],
    phone: [''],
    email: [''],
    address: [''],
    commune: [''],
    previsionalCoverage: [''],
  });

  // Estados vacíos reales: no mocks
  personLoaded = false;
  episodeLoaded = false;
  stageLoaded = false;

  isSearching = false;
  searched = false;
  personNotFound = false;
  selectedPerson: Postulant | null = null;
  searchError: string | null = null;
  showCreatePersonForm = false;

  readonly flowSteps = [
    'Persona',
    'Episodio',
    'Etapa por programa',
    'Eventos',
    'Referencias',
  ];

  readonly personFields = [
    'RUN',
    'Primer nombre',
    'Segundo nombre',
    'Primer apellido',
    'Segundo apellido',
    'Fecha nacimiento',
    'Sexo',
    'Teléfono',
    'Correo',
    'Dirección',
    'Comuna',
    'Previsión',
  ];

  readonly episodeFields = [
    'Código episodio',
    'Tipo episodio',
    'Fecha solicitud original',
    'Programa inicial',
    'Programa actual',
    'Vía de ingreso',
    'Remitente',
    'Derivador',
    'Número de tratamiento previo',
    'Estado actual',
    'Resultado actual',
    'Días acumulados',
    'Fecha ingreso a tratamiento',
    'Fecha egreso',
    'Motivo cierre',
    'Observación inicial',
  ];

  readonly stageFields = [
    'Programa responsable',
    'Orden de etapa',
    'Fecha recepción',
    'Fecha cierre',
    'Estado de etapa',
    'Resultado de etapa',
    'Etapa actual',
    'Motivo cierre etapa',
    'Observación cierre etapa',
  ];

  readonly structuralSections = [
    {
      icon: 'timeline',
      title: 'Eventos del episodio',
      subtitle:
        'Registro cronológico de citaciones, entrevistas, observaciones, ingreso, egreso y cierre.',
      empty: 'No existen eventos registrados.',
      fields: [
        'Tipo evento',
        'Fecha evento',
        'Hora evento',
        'Profesión',
        'Profesional',
        'Estado citación',
        'Resultado asociado',
        'Comentario de citación',
        'Observación general',
        'Próxima acción',
        'Fecha próxima acción',
        'Usuario que registra',
      ],
    },
    {
      icon: 'sync_alt',
      title: 'Referencias entre programas',
      subtitle:
        'Cierre de etapa origen y creación de etapa receptora sin reiniciar días.',
      empty:
        'No existen referencias registradas. Las referencias conservarán la fecha original y los días acumulados.',
      fields: [
        'Programa origen',
        'Programa destino',
        'Fecha referencia',
        'Motivo referencia',
        'Observación',
        'Documento asociado',
        'Usuario que registra',
        'Impacto de la referencia',
      ],
    },
    {
      icon: 'science',
      title: 'Sustancias',
      subtitle:
        'Sustancia principal, sustancias secundarias, nivel u orden y observación.',
      empty: 'No existen sustancias asociadas al episodio.',
      fields: [
        'Sustancia principal',
        'Sustancias secundarias',
        'Nivel / orden',
        'Observación',
      ],
    },
    {
      icon: 'attach_file',
      title: 'Documentos asociados',
      subtitle:
        'Documentos vinculados a episodio, etapa, evento, referencia, egreso o cierre.',
      empty: 'No existen documentos asociados.',
      fields: [
        'Tipo documento',
        'Archivo',
        'Asociado a',
        'Usuario que sube',
        'Fecha subida',
      ],
    },
    {
      icon: 'notification_important',
      title: 'Alertas y seguimiento',
      subtitle:
        'Alertas con prioridad, responsable, próxima acción y estado de seguimiento.',
      empty: 'No existen alertas activas.',
      fields: [
        'Tipo alerta',
        'Nivel prioridad',
        'Descripción',
        'Acción realizada',
        'Próxima acción',
        'Fecha comprometida',
        'Responsable',
        'Estado alerta',
      ],
    },
    {
      icon: 'verified_user',
      title: 'Auditoría / decisiones críticas',
      subtitle:
        'Trazabilidad de cierres, referencias, ingresos, egresos, rectificaciones y reversión superior.',
      empty:
        'Las decisiones críticas quedarán registradas con usuario, fecha y autorización.',
      fields: [
        'Acción crítica',
        'Valor anterior',
        'Valor nuevo',
        'Motivo',
        'Usuario que ejecuta',
        'Usuario que autoriza',
        'Fecha acción',
        'Reversión / rectificación',
      ],
    },
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

  showCreatePerson(): void {
    const rut = this.searchForm.getRawValue().rut?.trim() ?? '';

    this.showCreatePersonForm = true;

    this.personForm.patchValue({
      rut,
    });
  }

  searchPerson(): void {
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid || this.isSearching) return;

    const rut = this.searchForm.getRawValue().rut?.trim();

    if (!rut) return;

    this.isSearching = true;
    this.searched = true;
    this.personNotFound = false;
    this.selectedPerson = null;
    this.searchError = null;
    this.showCreatePersonForm = false;

    this.personLoaded = false;
    this.episodeLoaded = false;
    this.stageLoaded = false;

    this.postulantService
      .getAllRutPaginated({
        rut,
        page: 0,
        size: 1,
      })
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (response) => {
          const person = response?.content?.[0] ?? null;

          if (!person) {
            this.personNotFound = true;
            return;
          }

          this.selectedPerson = person;
          this.personLoaded = true;

          // Siguiente etapa futura:
          // buscar episodio activo de esta persona.
        },
        error: () => {
          this.searchError =
            'No fue posible consultar la persona. Intente nuevamente o contacte a soporte.';
        },
      });
  }
}
