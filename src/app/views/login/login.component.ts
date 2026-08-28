import {
  Component,
  inject,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { A11yModule } from '@angular/cdk/a11y';

// Servicios
import { AuthLoginService } from '../../services/auth.login.service';
import { TokenService } from '../../services/token.service';
import { AppCacheService } from '../../core/services/app-cache.service';

// Dialog
import { ErrorConfirmDialogComponent } from '../../shared/confirm-dialog/errorConfirmDialogComponent';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    A11yModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthLoginService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private appCache = inject(AppCacheService);

  hidePwd = true;
  loading = false;
  error = '';

  form = this.fb.group({
    email: [
      localStorage.getItem('last_email') ?? '',
      [Validators.required, Validators.email],
    ],
    password: ['', [Validators.required]],
    remember: [!!localStorage.getItem('last_email')],
  });

  constructor() {
    console.log(
      '[LoginComponent] 🟢 Componente de login cargado correctamente (tokens ya limpios)',
    );
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    void this.appCache.clearBeforeLoginIfNeeded();

    const sessionExpired =
      this.route.snapshot.queryParamMap.get('sessionExpired') === '1';

    if (sessionExpired) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { sessionExpired: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });

      this.mostrarSesionExpirada();
    }
  }

  login(): void {
    if (this.loading) return;

    (document.activeElement as HTMLElement)?.blur();
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();
    if (!email || !password) return;

    this.loading = true;

    this.auth.login(email, password).subscribe({
      next: (res) => {
        console.log('[login] respuesta backend:', res);

        if (!res || !res.token) {
          this.loading = false;
          this.mostrarErrorLogin('El correo o la contraseña son incorrectos.');
          return;
        }

        // =========================
        // NO GUARDAR TOKEN AQUÍ
        // =========================
        // AuthLoginService ya guardó token, refreshToken, roles, programs y profile.
        // Si volvemos a llamar setTokens(), se puede borrar el perfil del usuario.
        console.log('[login] Sesión ya guardada por AuthLoginService');

        // Guardar email si corresponde
        if (remember) localStorage.setItem('last_email', email);
        else localStorage.removeItem('last_email');

        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') || '/inicio';

        console.log('[login] ⏳ Navegando al sistema...');

        // =========================
        // NAVEGACIÓN + SESIÓN
        // =========================
        this.router.navigateByUrl(returnUrl, { replaceUrl: true }).then(() => {
          // La sesión será inicializada por TemplateComponent.
          this.loading = false;
        });
      },
      error: (err) => {
        const status = Number(err?.status ?? -1);

        /*
         * Sin red o backend temporalmente caído.
         * BackendStatusService ya muestra el modal institucional,
         * por lo que no abrimos un segundo mensaje desde el login.
         */
        if ([0, 502, 503, 504].includes(status)) {
          this.loading = false;
          return;
        }

        if (status === 401) {
          this.loading = false;
          this.mostrarErrorLogin('Usuario o contraseña incorrectos.');
          return;
        }

        if (status === 403) {
          this.loading = false;
          this.mostrarErrorLogin(
            'Tu usuario no tiene permisos para acceder al sistema.',
          );
          return;
        }

        this.loading = false;
        this.mostrarErrorLogin(
          'No fue posible iniciar sesión. Intenta nuevamente.',
        );
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.form.value.email) {
      const pwd = document.querySelector(
        'input[formControlName="password"]',
      ) as HTMLInputElement;
      pwd?.focus();
    }
  }

  goToRecover(): void {
    const emailInput = document.querySelector(
      'input[formControlName="email"]',
    ) as HTMLInputElement;

    const email = emailInput?.value?.trim() || '';
    this.router.navigate(['/auth/recover'], { queryParams: { email } });
  }

  @ViewChild('loginButton') loginButton!: ElementRef<HTMLButtonElement>;

  private mostrarSesionExpirada(): void {
    this.dialog.open(ErrorConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Sesión expirada',
        message:
          'Su sesión ha finalizado. Por seguridad, debe iniciar sesión nuevamente para continuar.',
        confirmText: 'Aceptar',
        color: 'warn',
        icon: 'schedule',
        dense: true,
      },
    });
  }

  private mostrarErrorLogin(mensaje: string): void {
    this.dialog.open(ErrorConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Error de inicio de sesión',
        message: mensaje,
        confirmText: 'Aceptar',
        color: 'warn',
        icon: 'error',
        dense: true,
      },
    });
  }
}
