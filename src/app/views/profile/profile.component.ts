//  C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\views\profile\profile.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthLoginService } from '../../services/auth.login.service';
import { TokenService } from '../../services/token.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogOkComponent } from '../../shared/confirm-dialog/confirm-dialog-ok.component';
import { ErrorConfirmDialogComponent } from '../../shared/confirm-dialog/errorConfirmDialogComponent';

interface DecodedToken {
  fullName?: string;
  username?: string;
  email?: string;
  roles?: string[];
  programs?: string[];
  exp?: number;
  iat?: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private dialog = inject(MatDialog);
  private auth = inject(AuthLoginService);
  private tokenService = inject(TokenService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  userData: DecodedToken | null = null;
  loading = false;

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  /** 🔍 Decodifica token y carga datos */
  loadProfile(): void {
    const token = this.tokenService.getAccessToken();
    if (!token) {
      console.warn('[Profile] No hay token disponible.');
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as DecodedToken;
      this.userData = payload;
    } catch (err) {
      this.dialog.open(ErrorConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Datos del Usuario',
          message: 'Error al cargar los datos del usuario.',
          icon: 'warning',
          color: 'accent',
          confirmText: 'Revisar',
        },
      });
    }
  }

  /** 🔐 Simulación cambio de contraseña */
  changePassword(): void {
    if (this.loading) return;

    const { newPassword, confirmPassword } = this.passwordForm.value;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (newPassword !== confirmPassword) {
      this.dialog.open(ErrorConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Datos incorrectos',
          message: 'La nueva contraseña y su confirmación no coinciden.',
          icon: 'warning',
          color: 'accent',
          confirmText: 'Revisar',
        },
      });
      return;
    }

    this.loading = true;

    setTimeout(() => {
      this.loading = false;
      this.passwordForm.reset();

      this.dialog.open(ConfirmDialogOkComponent, {
        width: '420px',
        data: {
          title: 'Contraseña actualizada',
          message: 'Tu contraseña fue actualizada correctamente.',
          icon: 'check_circle',
          color: 'primary',
          confirmText: 'Aceptar',
        },
      });
    }, 1500);
  }

  goBack(): void {
    this.router.navigate(['/inicio']); // o history.back()
  }
}
