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
import { ErrorConfirmDialogComponent } from '../../shared/confirm-dialog/errorConfirmDialogComponent';

interface RoleProfile {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
}

interface ProgramProfile {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
}

interface DecodedToken {
  fullName?: string;
  username?: string;
  email?: string;
  roles?: Array<string | RoleProfile>;
  programs?: Array<string | ProgramProfile>;
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
  roleNames = 'No asignado';
  programNames = 'Ninguno asignado';
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

      const storedRoles = this.tokenService.getUserRoles();
      const storedPrograms = this.tokenService.getUserPrograms();

      this.roleNames = this.formatItemNames(
        payload.roles?.length ? payload.roles : storedRoles,
        'No asignado',
      );

      this.programNames = this.formatItemNames(
        payload.programs?.length ? payload.programs : storedPrograms,
        'Ninguno asignado',
      );
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

  /** Formatea los nombres de roles y programas. */
  private formatItemNames(
    items: Array<string | RoleProfile | ProgramProfile> | null | undefined,
    emptyLabel: string,
  ): string {
    if (!Array.isArray(items) || items.length === 0) {
      return emptyLabel;
    }

    const names = items
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        return String(
          item?.name ??
            item?.description ??
            item?.code ??
            '',
        ).trim();
      })
      .filter(Boolean);

    return names.length ? names.join(', ') : emptyLabel;
  }

  /** Actualiza la contrasena del usuario. */
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

    this.dialog.open(ErrorConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Funcionalidad no disponible',
        message:
          'El cambio de contrase\u00f1a a\u00fan no est\u00e1 habilitado en el servidor.',
        icon: 'info',
        color: 'accent',
        confirmText: 'Aceptar',
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/inicio']); // o history.back()
  }
}
