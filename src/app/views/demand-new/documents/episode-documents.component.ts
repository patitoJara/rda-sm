import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { finalize } from 'rxjs/operators';

import {
  DemandDocumentTypeDTO,
  EpisodeDocumentDTO,
} from '../../../core/models/demand-document.models';
import { DemandDocumentService } from '../../../core/services/demand-document.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-episode-documents',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './episode-documents.component.html',
  styleUrls: ['./episode-documents.component.scss'],
})
export class EpisodeDocumentsComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DemandDocumentService);
  private readonly dialog = inject(MatDialog);

  @Input() episodeId: number | null = null;
  @Input() stageId: number | null = null;
  @Input() canManage = true;

  @Output() documentsChanged = new EventEmitter<void>();

  readonly uploadForm = this.fb.nonNullable.group({
    documentTypeCode: ['', Validators.required],
  });

  documentTypes: DemandDocumentTypeDTO[] = [];
  documents: EpisodeDocumentDTO[] = [];

  selectedFile: File | null = null;

  loading = false;
  loadingTypes = false;
  uploading = false;
  actionDocumentId: number | null = null;

  showUploadForm = false;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadDocuments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const episodeChange = changes['episodeId'];

    if (episodeChange && !episodeChange.firstChange) {
      this.loadDocuments();
    }
  }

  get hasSelectedDocumentType(): boolean {
    return !!this.uploadForm.controls.documentTypeCode.value;
  }

  get hasSelectedFile(): boolean {
    return !!this.selectedFile;
  }

  get canUpload(): boolean {
    return (
      this.canManage &&
      !!this.episodeId &&
      this.hasSelectedDocumentType &&
      this.hasSelectedFile &&
      !this.uploading
    );
  }

  toggleUploadForm(): void {
    this.showUploadForm = !this.showUploadForm;
    this.clearMessages();

    if (!this.showUploadForm) {
      this.resetUploadForm();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedFile = input.files?.[0] ?? null;
    this.clearMessages();
  }

  cancelUpload(): void {
    this.showUploadForm = false;
    this.resetUploadForm();
    this.clearMessages();
  }

  uploadDocument(): void {
    if (
      !this.episodeId ||
      !this.selectedFile ||
      this.uploadForm.invalid ||
      this.uploading
    ) {
      this.uploadForm.markAllAsTouched();

      if (!this.selectedFile) {
        this.errorMessage = 'Debe seleccionar un archivo para continuar.';
      }

      return;
    }

    const documentTypeCode = this.uploadForm.controls.documentTypeCode.value;

    this.uploading = true;
    this.clearMessages();

    this.documentService
      .uploadDocument(this.episodeId, this.selectedFile, documentTypeCode, {
        stageId: this.stageId,
      })
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'El documento fue cargado correctamente.';

          this.showUploadForm = false;
          this.resetUploadForm();
          this.loadDocuments();
          this.documentsChanged.emit();
        },
        error: (error) => {
          console.error('[EpisodeDocuments] Error subiendo documento:', error);

          this.errorMessage = this.getActionErrorMessage(
            error,
            'No fue posible cargar el documento.',
          );
        },
      });
  }

  openDocument(item: EpisodeDocumentDTO): void {
    if (this.actionDocumentId !== null) {
      return;
    }

    this.actionDocumentId = item.id;
    this.clearMessages();

    this.documentService
      .downloadDocument(item.id, 'inline')
      .pipe(
        finalize(() => {
          this.actionDocumentId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob) {
            this.errorMessage =
              'El servidor no devolvió el contenido del documento.';
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          const link = window.document.createElement('a');

          link.href = objectUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.click();

          window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 60_000);
        },
        error: (error) => {
          console.error(
            '[EpisodeDocuments] Error visualizando documento:',
            error,
          );

          this.errorMessage = this.getActionErrorMessage(
            error,
            'No fue posible visualizar el documento.',
          );
        },
      });
  }

  downloadDocument(item: EpisodeDocumentDTO): void {
    if (this.actionDocumentId !== null) {
      return;
    }

    this.actionDocumentId = item.id;
    this.clearMessages();

    this.documentService
      .downloadDocument(item.id, 'attachment')
      .pipe(
        finalize(() => {
          this.actionDocumentId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob) {
            this.errorMessage =
              'El servidor no devolvió el archivo solicitado.';
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          const link = window.document.createElement('a');

          link.href = objectUrl;
          link.download = item.originalFilename || `documento-${item.id}`;
          link.click();

          window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          });
        },
        error: (error) => {
          console.error(
            '[EpisodeDocuments] Error descargando documento:',
            error,
          );

          this.errorMessage = this.getActionErrorMessage(
            error,
            'No fue posible descargar el documento.',
          );
        },
      });
  }

  replaceDocument(item: EpisodeDocumentDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    input.value = '';

    if (!file || !this.canManage) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Reemplazar documento',
        message:
          `Se reemplazará “${item.originalFilename}” por ` +
          `“${file.name}”. El archivo anterior dejará de estar ` +
          'disponible. ¿Deseas continuar?',
        confirmText: 'Reemplazar',
        cancelText: 'Cancelar',
        color: 'primary',
        icon: 'published_with_changes',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.actionDocumentId = item.id;
      this.clearMessages();

      this.documentService
        .replaceDocument(item.id, file, item.documentTypeCode, {
          stageId: item.stageId,
          eventId: item.eventId,
          referenceId: item.referenceId,
        })
        .pipe(
          finalize(() => {
            this.actionDocumentId = null;
          }),
        )
        .subscribe({
          next: () => {
            this.successMessage = 'El documento fue reemplazado correctamente.';

            this.loadDocuments();
            this.documentsChanged.emit();
          },
          error: (error) => {
            console.error(
              '[EpisodeDocuments] Error reemplazando documento:',
              error,
            );

            this.errorMessage = this.getActionErrorMessage(
              error,
              'No fue posible reemplazar el documento.',
            );
          },
        });
    });
  }

  deleteDocument(item: EpisodeDocumentDTO): void {
    if (!this.canManage || this.actionDocumentId !== null) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar documento',
        message:
          `Se eliminará “${item.originalFilename}”. ` +
          'El archivo dejará de estar disponible para consulta. ' +
          '¿Deseas continuar?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.actionDocumentId = item.id;
      this.clearMessages();

      this.documentService
        .deleteDocument(item.id)
        .pipe(
          finalize(() => {
            this.actionDocumentId = null;
          }),
        )
        .subscribe({
          next: () => {
            this.successMessage = 'El documento fue eliminado correctamente.';

            this.loadDocuments();
            this.documentsChanged.emit();
          },
          error: (error) => {
            console.error(
              '[EpisodeDocuments] Error eliminando documento:',
              error,
            );

            this.errorMessage = this.getActionErrorMessage(
              error,
              'No fue posible eliminar el documento.',
            );
          },
        });
    });
  }

  getDocumentTypeName(documentTypeCode: string): string {
    return (
      this.documentTypes.find((type) => type.code === documentTypeCode)?.name ??
      documentTypeCode ??
      'Documento del episodio'
    );
  }

  getDocumentIcon(item: EpisodeDocumentDTO): string {
    const mimeType = String(item.mimeType ?? '').toLowerCase();

    if (mimeType === 'application/pdf') {
      return 'picture_as_pdf';
    }

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (
      mimeType.includes('word') ||
      mimeType.includes('officedocument.wordprocessingml')
    ) {
      return 'description';
    }

    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'table_view';
    }

    return 'insert_drive_file';
  }

  getAssociationLabel(item: EpisodeDocumentDTO): string {
    if (item.referenceId) {
      return `Referencia ${item.referenceId}`;
    }

    if (item.eventId) {
      return `Evento ${item.eventId}`;
    }

    if (item.stageId) {
      return `Etapa ${item.stageId}`;
    }

    return 'Documento general del episodio';
  }

  formatFileSize(bytes: number): string {
    const value = Number(bytes ?? 0);

    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackDocument(_index: number, item: EpisodeDocumentDTO): number {
    return item.id;
  }

  private loadDocumentTypes(): void {
    this.loadingTypes = true;

    this.documentService
      .getDocumentTypes()
      .pipe(
        finalize(() => {
          this.loadingTypes = false;
        }),
      )
      .subscribe({
        next: (types) => {
          this.documentTypes = types ?? [];
        },
        error: (error) => {
          console.error('[EpisodeDocuments] Error cargando tipos:', error);

          this.documentTypes = [];
          this.errorMessage = 'No fue posible cargar los tipos de documento.';
        },
      });
  }

  private loadDocuments(): void {
    if (!this.episodeId) {
      this.documents = [];
      return;
    }

    this.loading = true;

    this.documentService
      .listDocuments(this.episodeId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (documents) => {
          this.documents = [...(documents ?? [])].sort(
            (a, b) =>
              new Date(b.uploadedAt).getTime() -
              new Date(a.uploadedAt).getTime(),
          );
        },
        error: (error) => {
          console.error('[EpisodeDocuments] Error cargando documentos:', error);

          this.documents = [];
          this.errorMessage = this.getActionErrorMessage(
            error,
            'No fue posible cargar los documentos del episodio.',
          );
        },
      });
  }

  private resetUploadForm(): void {
    this.uploadForm.reset({
      documentTypeCode: '',
    });

    this.selectedFile = null;
  }

  private clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  private getActionErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (error.status === 0) {
      return 'No fue posible establecer conexión con el servidor.';
    }

    if (error.status === 400) {
      return 'El servidor rechazó los datos enviados. Revise el archivo y el tipo documental.';
    }

    if (error.status === 403) {
      return 'Su perfil no cuenta con permisos para realizar esta operación.';
    }

    if (error.status === 404) {
      return 'El documento o episodio solicitado ya no se encuentra disponible.';
    }

    if (error.status === 409) {
      return 'La operación presenta un conflicto con el estado actual del documento.';
    }

    if (error.status === 413) {
      return 'El archivo supera el tamaño permitido por el servidor.';
    }

    if (error.status === 415) {
      return 'El formato del archivo no está permitido.';
    }

    return fallback;
  }
}
