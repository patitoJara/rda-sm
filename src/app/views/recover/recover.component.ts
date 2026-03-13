import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// 📧 servicio correo
import { MailService } from '@app/core/services/mail.service';

@Component({
  selector: 'app-recover',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recover.component.html',
  styleUrls: ['./recover.component.scss'],
})
export class RecoverComponent {

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private mailService = inject(MailService);

  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get f() {
    return this.form.controls;
  }

  /** 📧 Enviar correo de recuperación */
  sendRecovery(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.value.email!;

    this.loading = true;

    this.mailService.send({

      to: email,

      subject: 'Recuperación de contraseña',

      message: `
Estimado usuario,

Hemos recibido una solicitud para recuperar su contraseña.

Si usted realizó esta solicitud, comuníquese con el administrador del sistema
para realizar el proceso de restablecimiento.

Sistema Teletrabajo
Servicio de Salud Magallanes
      `

    }).subscribe({

      next: () => {

        this.loading = false;

        this.snackBar.open(
          `Se ha enviado un correo a ${email}`,
          'OK',
          { duration: 4000 }
        );

        this.router.navigate(['/auth/login']);

      },

      error: (err) => {

        this.loading = false;

        console.error('Error enviando correo', err);

        this.snackBar.open(
          'No fue posible enviar el correo.',
          'OK',
          { duration: 4000, panelClass: ['warn-snackbar'] }
        );

      }

    });

  }

}