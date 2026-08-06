import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs';

import {
  DemandService,
  PurgeEpisodeResponse,
} from '../../core/services/demand.service';

@Component({
  standalone: true,
  selector: 'app-episode-purge',
  templateUrl: './episode-purge.component.html',
  styleUrls: ['./episode-purge.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class EpisodePurgeComponent {
  private readonly demandService = inject(DemandService);
  private readonly snackBar = inject(MatSnackBar);

  episodeIdInput: number | null = null;
  confirmationCode = '';

  longitudinal: any = null;
  episode: any = null;
  purgeResult: PurgeEpisodeResponse | null = null;

  loading = false;
  purging = false;
  errorMessage = '';

  get episodeId(): number | null {
    const value = Number(this.episodeIdInput);

    return Number.isInteger(value) && value > 0 ? value : null;
  }

  get episodeCode(): string {
    const value =
      this.episode?.episodeCode ??
      this.episode?.code ??
      this.episode?.episode?.code ??
      '';

    return String(value).trim();
  }

  get confirmationTarget(): string {
    return this.episodeCode || String(this.episodeId ?? '');
  }

  get personName(): string {
    const person =
      this.longitudinal?.postulant ??
      this.episode?.postulant ??
      this.episode?.person ??
      null;

    if (!person) {
      return 'Persona no informada';
    }

    const explicitName = person.fullName ?? person.name;

    if (explicitName) {
      return String(explicitName);
    }

    return [
      person.firstName,
      person.firstLastName ?? person.lastName,
      person.secondLastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Persona no informada';
  }

  get personRut(): string {
    const person =
      this.longitudinal?.postulant ??
      this.episode?.postulant ??
      this.episode?.person ??
      null;

    return String(person?.rut ?? person?.run ?? 'No informado');
  }

  get programName(): string {
    const stages = Array.isArray(this.longitudinal?.stages)
      ? this.longitudinal.stages
      : [];

    const stage =
      stages.find(
        (item: any) =>
          item?.current === true ||
          item?.isCurrent === true ||
          item?.active === true,
      ) ??
      stages[stages.length - 1] ??
      null;

    return String(
      this.episode?.currentProgram?.name ??
        stage?.program?.name ??
        'No informado',
    );
  }

  get stateLabel(): string {
    return String(
      this.episode?.state?.name ??
        this.episode?.state?.code ??
        this.episode?.stateCode ??
        this.episode?.status ??
        'No informado',
    );
  }

  get deletionConfirmed(): boolean {
    const expected = this.normalize(this.confirmationTarget);
    const entered = this.normalize(this.confirmationCode);

    return (
      !!this.episode &&
      !!expected &&
      entered === expected &&
      !this.loading &&
      !this.purging
    );
  }

  get deletedRows(): Array<[string, number]> {
    return Object.entries(
      this.purgeResult?.deletedRows ?? {},
    );
  }

  onEpisodeIdChange(): void {
    this.longitudinal = null;
    this.episode = null;
    this.purgeResult = null;
    this.confirmationCode = '';
    this.errorMessage = '';
  }

  searchEpisode(): void {
    const episodeId = this.episodeId;

    if (!episodeId) {
      this.errorMessage = 'Ingrese un ID de episodio válido.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.longitudinal = null;
    this.episode = null;
    this.purgeResult = null;
    this.confirmationCode = '';

    this.demandService
      .getEpisodeLongitudinal(episodeId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const episodes = Array.isArray(response?.episodes)
            ? response.episodes
            : [];

          const requestedEpisode = episodes.find(
            (item: any) =>
              Number(item?.id ?? item?.episodeId ?? 0) === episodeId,
          );

          const episode =
            response?.episode ??
            requestedEpisode ??
            response?.activeEpisode ??
            (Number(response?.id ?? response?.episodeId ?? 0) === episodeId
              ? response
              : null);

          if (!episode) {
            this.errorMessage =
              'La respuesta no contiene el episodio solicitado.';
            return;
          }

          this.longitudinal = response;
          this.episode = episode;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'No existe un episodio con ese ID.'
              : this.resolveErrorMessage(
                  error,
                  'No fue posible consultar el episodio.',
                );
        },
      });
  }

  purgeEpisode(): void {
    const episodeId = this.episodeId;

    if (!episodeId || !this.deletionConfirmed) {
      return;
    }

    this.purging = true;
    this.errorMessage = '';
    this.purgeResult = null;

    this.demandService
      .purgeEpisode(episodeId)
      .pipe(finalize(() => (this.purging = false)))
      .subscribe({
        next: (response) => {
          this.purgeResult = response;
          this.longitudinal = null;
          this.episode = null;
          this.confirmationCode = '';

          this.snackBar.open(
            `Episodio ${response.episodeCode} eliminado correctamente.`,
            'Cerrar',
            { duration: 5000 },
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible eliminar el episodio.',
          );
        },
      });
  }

  private resolveErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const backendMessage =
      error?.error?.message ??
      error?.error?.error ??
      (typeof error?.error === 'string' ? error.error : '');

    return String(backendMessage || fallback);
  }

  private normalize(value: string): string {
    return String(value ?? '').trim().toUpperCase();
  }
}