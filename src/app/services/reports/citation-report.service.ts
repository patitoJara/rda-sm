// C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\services\reports\citation-report.service.ts

import { Injectable, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';
import { capitalizeWords } from '@app/core/utils/text.utils';

export interface CitationPrintPayload {
  citationTypeName: string;
  citationDate: string;
  citationTime: string;
  demandante: string;
  rut: string;
  professionalName: string;
  professionName: string;
  programName: string;
  programAddress?: string | null;
  programPhone?: string | null;
  programEmail?: string | null;
  episodeCode?: string | null;
  usuario: string;
}

@Injectable({
  providedIn: 'root',
})
export class CitationReportService {
  private dialog = inject(MatDialog);

  generateFromCitation(payload: CitationPrintPayload): string {
    const {
      citationTypeName,
      citationDate,
      citationTime,
      demandante,
      rut,
      professionalName,
      professionName,
      programName,
      programAddress,
      programPhone,
      programEmail,
      episodeCode,
      usuario,
    } = payload;

    if (!citationDate || !citationTime || !demandante) {
      this.dialog.open(ConfirmDialogOkComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: 'Imprimir citación',
          message:
            'La citación no posee todos los datos necesarios para imprimirla.',
          icon: 'print',
          confirmText: 'Aceptar',
        },
      });

      return '';
    }

    const escapeHtml = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(citationDate)
      ? `${citationDate}T12:00:00`
      : citationDate;

    const formattedDate = formatDate(
      normalizedDate,
      "EEEE d 'de' MMMM 'de' y",
      'es-CL',
    );

    const finalDate =
      formattedDate.charAt(0).toUpperCase() +
      formattedDate.slice(1);

    const programContact = [
      programAddress,
      programPhone,
      programEmail,
    ]
      .filter(Boolean)
      .map((value) => escapeHtml(value))
      .join(' · ');

    return `
      <div id="print-citation">
        <style>
          @page {
            size: Letter; margin: 8mm;
          }

          #print-citation {
            color: #173f49;
            font-family: Roboto, Arial, sans-serif;
            width: 100%;
            height: calc(5.5in - 8mm);
            max-height: calc(5.5in - 8mm);
            box-sizing: border-box;
            overflow: hidden;
          }

          .citation-title {
            margin: 0 0 6px;
            padding: 4px 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 58px;
            border-bottom: 2px solid #1565c0;
            box-sizing: border-box;
          }

          .citation-logo {
            flex: 0 0 auto;
            width: auto;
            height: 54px;
            object-fit: contain;
          }

          .citation-title-text {
            flex: 1 1 auto;
            min-width: 0;
            text-align: center;
          }

          .citation-title h2 {
            margin: 0;
            color: #1565c0;
            font-size: 18px;
          }

          .citation-title p {
            margin: 2px 0 0;
            font-size: 13px;
            font-weight: 700;
          }

          .citation-data {
            width: 100%;
            margin-top: 8px;
            border-collapse: collapse;
          }

          .citation-data td {
            padding: 5px 6px;
            border-bottom: 1px solid #d9e6e9;
            vertical-align: top;
          }

          .citation-data .label {
            width: 30%;
            color: #48666e;
            font-weight: 700;
          }

          .citation-notice {
            margin-top: 10px;
            padding: 7px 10px;
            border-left: 4px solid #1565c0;
            background: #eef6ff;
            line-height: 1.3;
          }

          .citation-signature {
            margin-top: 22px;
            text-align: center;
          }
        </style>

        <div class="citation-title">
          <img
            src="${window.location.origin}/assets/logoSSM.png"
            class="citation-logo"
            alt="Servicio de Salud Magallanes"
          />
          <div class="citation-title-text">
            <h2>Comprobante de citación</h2>
            <p>${escapeHtml(citationTypeName || 'Citación')}</p>
          </div>
        </div>

        <table class="citation-data">
          <tr>
            <td class="label">Programa responsable</td>
            <td>${escapeHtml(programName || '-')}</td>
          </tr>
          ${
            programContact
              ? `
          <tr>
            <td class="label">Contacto del programa</td>
            <td>${programContact}</td>
          </tr>`
              : ''
          }
          <tr>
            <td class="label">Persona citada</td>
            <td>${escapeHtml(capitalizeWords(demandante))}</td>
          </tr>
          <tr>
            <td class="label">RUN</td>
            <td>${escapeHtml(rut || '-')}</td>
          </tr>
          <tr>
            <td class="label">Episodio</td>
            <td>${escapeHtml(episodeCode || '-')}</td>
          </tr>
          <tr>
            <td class="label">Profesional</td>
            <td>
              ${escapeHtml(professionalName || 'No informado')}
              ${
                professionName
                  ? ` · ${escapeHtml(professionName)}`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td class="label">Fecha</td>
            <td>${escapeHtml(finalDate)}</td>
          </tr>
          <tr>
            <td class="label">Hora</td>
            <td>${escapeHtml(citationTime.slice(0, 5))}</td>
          </tr>
        </table>

        <div class="citation-notice">
          Se recomienda presentarse con anticipación. Si no puede asistir,
          comuníquese oportunamente con el programa responsable.
        </div>

        <div class="citation-signature">
          ______________________________________<br>
          ${escapeHtml(capitalizeWords(usuario || 'Usuario responsable'))}
        </div>
      </div>
    `;
  }

  generateFromMovement(payload: {
    numero: number;
    movement: any;
    demandante: string;
    usuario: string;
    professions: any[];
    program: string | null;
    rut: string;
  }): string {
    const { numero, movement, demandante, usuario, professions, program, rut } =
      payload;

    // ================================
    // 🔎 Validaciones mínimas
    // ================================
    if (
      !movement?.date_attention ||
      !movement?.hour_attention ||
      !movement?.profession?.id ||
      !movement?.full_name
    ) {
      this.dialog.open(ConfirmDialogOkComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: 'Imprimir Citación',
          message: 'Faltan datos para imprimir la citación.',
          icon: 'print',
          confirmText: 'Aceptar',
        },
      });

      return ''; // ✅ OBLIGATORIO
    }

    const titulo = `${this.numeroATexto(numero)} Citación`;

    const professionObj = professions.find(
      (p) => Number(p.id) === Number(movement.profession.id),
    );

    const profesionNombre = professionObj?.name ?? 'Profesión no informada';
    const rutFmt = rut ?? '-';

    const fechaFormateada = formatDate(
      movement.date_attention,
      "EEEE d 'de' MMMM 'del' y",
      'es-CL',
    );

    const fechaFinal =
    fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    const demandanteFmt = capitalizeWords(demandante);
    const usuarioFmt = capitalizeWords(usuario);
    const profesionalFmt = capitalizeWords(
      `${movement.full_name} - ${profesionNombre}`,
    );

    // ================================
    // 🧾 HTML DEL REPORTE
    // ================================
    return `
    <div id="print-citation">
      <style>
        @page { size: Letter; margin: 8mm; }
        body { font-family: Roboto, Arial, sans-serif; font-size: 13px; }
        .header { 
            text-align: center; 
            padding-bottom: 8px; 
        }    
        h2, h3 { margin: 4px 0; color: #1565c0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 6px; }
        .label { width: 30%; font-weight: bold; }
        .firma { margin-top: 120px; text-align: center; }
      </style>

      <div class="header">        
          <div class="header-text">
            <h2>SERVICIO DE SALUD MAGALLANES</h2>
            <h3>Departamento de Salud Mental</h3>
            <h3>Registro de Demanda de Atención de Tratamientos de Drogas</h3>
          </div>
      </div>

      <h2 style="text-align:center; margin-top:16px;border-bottom: 1px solid #1565c0;border-top: 1px solid #1565c0;">
        ${titulo}
      </h2>

      <table>
        <tr><td class="label">Programa</td><td>${program ?? '-'}</td></tr>
        <tr><td class="label">Demandante</td><td>${demandanteFmt}</td></tr>
        <tr><td class="label">RUT del Demandante</td><td>${rutFmt}</td></tr>
        <tr><td class="label">Profesional</td><td>${profesionalFmt}</td></tr>
        <tr><td class="label">Fecha Citación</td><td>${fechaFinal}</td></tr>
        <tr><td class="label">Hora Citación</td><td>${movement.hour_attention}</td></tr>
      </table>

      <p style="margin-top:24px;">
        <strong>Es importante llegar con antelación. Si no podrá asistir, favor informar.</strong>
      </p>

      <div class="firma">
        ______________________________________<br>
        ${usuarioFmt}
      </div>
    </div>
  `;
  }

  numeroATexto(n: number): string {
    const map: Record<number, string> = {
      1: 'Primera',
      2: 'Segunda',
      3: 'Tercera',
      4: 'Cuarta',
      5: 'Quinta',
      6: 'Sexta',
      7: 'Séptima',
      8: 'Octava',
      9: 'Novena',
      10: 'Décima',
    };

    return map[n] ?? `${n}ª`;
  }

  printHtml(html: string): void {
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const logoUrl = `${window.location.origin}/assets/logoSSM.png`;

    doc.open();
    doc.write(`
    <html>
      <head>
        <title>Citación</title>
        <style>
          @page { size: Letter; margin: 8mm; }

          body {
            font-family: Roboto, Arial, sans-serif;
            font-size: 13px;
          }

          .logo-container {
            text-align: left;
            margin-bottom: 10px;
          }

          .logo {
            height: 80px;
          }

          .header-text {
            text-align: center;            
            padding-bottom: 8px;
            margin-bottom: 20px;
          }

          .header-text h2,
          .header-text h3 {
            margin: 2px 0;
            color: #1565c0;
          }
        </style>
      </head>
      <body>

        <div
          class="logo-container"
          style="${html.includes('class="citation-logo"') ? 'display:none;' : ''}"
        >
          <img src="${logoUrl}" class="logo" />
        </div>
        ${html}

      </body>
    </html>
  `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    }, 300);
  }
}
