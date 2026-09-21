import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly http = inject(HttpClient);

  private readonly notificationUrl =
    `${environment.apiBaseUrl}/demand/notifications/email`;

  // con mi gmail
  //private serviceId = 'service_f56t47b';
  //private templateId = 'template_ajgvyt8';
  //private publicKey = 'rHZGN1qKPFPSLn8tc';

  // con mi redsalud.gob.co
  private serviceId = 'default_service';
  private templateId = 'template_a953qnq';
  private publicKey = 'rHZGN1qKPFPSLn8tc';


  /**
   * Envía un correo dinámico usando EmailJS
   * @param toEmail Correo principal del destinatario
   * @param ccEmail Correo en copia (opcional)
   * @param subject Asunto o título del correo
   * @param body Texto o mensaje principal
   */
  sendEmail(
    toEmail: string,
    ccEmail?: string,
    subject: string = 'Mensaje desde el sistema RDA-SM',
    body: string = ''
  ): Promise<EmailJSResponseStatus> {
    const templateParams = {
      email: toEmail,      // {{email}}
      cc_email: ccEmail || '', // {{cc_email}}
      name: 'Sistema RDA-SM',  // {{name}}
      title: subject,          // {{title}}
      message: body,           // {{message}} — puedes usarlo en la plantilla
    };

    console.log('[EmailService] 📤 Enviando correo con:', templateParams);

    return emailjs.send(this.serviceId, this.templateId, templateParams, this.publicKey);
  }

  /**
   * Envía la solicitud de recuperación mediante el backend Spring.
   * El endpoint es público para permitir su uso antes del login.
   */
  async sendRecoveryEmail(
    userEmail: string,
  ): Promise<unknown> {
    const payload = {
      to: userEmail,
      subject: 'Solicitud de recuperación de acceso RDA-SM',
      message: `
Estimado/a usuario/a,

Hemos recibido una solicitud de recuperación de acceso al Sistema de Gestión de Demanda.

El equipo de soporte TIC gestionará el restablecimiento correspondiente.

Si usted no realizó esta solicitud, puede ignorar este mensaje.

Atentamente,
Departamento TIC
Servicio de Salud Magallanes
      `.trim(),
    };

    return firstValueFrom(
      this.http.post(
        this.notificationUrl,
        payload,
      ),
    );
  }
}
