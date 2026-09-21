import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

// Servicio de correo
import { EmailService } from '../../../core/services/email.service';

@Component({
  standalone: true,
  selector: 'app-recover',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './recover.component.html',
  styleUrls: ['./recover.component.scss'],
})
export class RecoverComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private emailService = inject(EmailService);

  loading = false;
  sent = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) this.form.patchValue({ email: emailParam });
  }

  /** 🔹 Envía solicitud de recuperación */
  recover(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const userEmail = this.form.value.email?.trim();

    if (!userEmail) {
      return;
    }

    this.loading = true;

    console.log(
      `[Recover] Solicitud de recuperación para: ${userEmail}`,
    );

    this.emailService
      .sendRecoveryEmail(userEmail)
      .then(() => {
        this.completeRecoveryRequest();
      })
      .catch((error) => {
        /*
         * No exponemos al usuario diferencias entre éxito y error.
         * El detalle queda disponible solamente en consola.
         */
        console.warn(
          '[Recover] Error interno enviando solicitud:',
          error,
        );

        this.completeRecoveryRequest();
      });
  }

  private completeRecoveryRequest(): void {
    this.loading = false;
    this.sent = true;

    this.snackBar.open(
      '📩 Si el correo está registrado, recibirás instrucciones.',
      'Cerrar',
      {
        duration: 4000,
        panelClass: ['success-snackbar'],
      },
    );

    setTimeout(() => {
      void this.router.navigateByUrl('/auth/login');
    }, 8000);
  }

  /** 🔹 Volver al login conservando el email */
  backToLogin(): void {
    const email = this.form.get('email')?.value;
    this.router.navigate(['/auth/login'], { queryParams: { email } });
  }
}
