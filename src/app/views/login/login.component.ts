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
import { SessionService } from '../../core/services/session.service';
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
  private sessionService = inject(SessionService);
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
  }

  login(): void {
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
        // GUARDAR TOKEN
        // =========================
        this.tokenService.setTokens(res.token, res.refreshToken);
        console.log('[login] Token guardado correctamente');

        // Guardar email si corresponde
        if (remember) localStorage.setItem('last_email', email);
        else localStorage.removeItem('last_email');

        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') || '/inicio';

        console.log('[login] ⏳ Navegando y reiniciando sesión...');

        // =========================
        // NAVEGACIÓN + SESIÓN
        // =========================
        this.router.navigateByUrl(returnUrl, { replaceUrl: true }).then(() => {
          // 🔑 AQUÍ SE REINICIA LA SESIÓN (mata timers viejos)
          this.sessionService.startSession('login');
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[login] ❌ Error de autenticación:', err);
        this.loading = false;

        if (err.status === 401) {
          this.mostrarErrorLogin('Usuario o contraseña incorrectos.');
        } else if (err.status === 403) {
          this.mostrarErrorLogin(
            'Tu usuario no tiene permisos para acceder al sistema.',
          );
        } else {
          this.mostrarErrorLogin(
            'No fue posible iniciar sesión. Intenta nuevamente.',
          );
        }
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
