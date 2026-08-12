import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SistraReportData } from '../../models/sistra-report.types';

@Component({
  selector: 'app-sistra-report-preview',
  standalone: true,
  templateUrl: './sistra-report-preview.component.html',
  styleUrls: ['./sistra-report-preview.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class SistraReportPreviewComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<SistraReportPreviewComponent>,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: SistraReportData,
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  print(): void {
    window.print();
  }
}