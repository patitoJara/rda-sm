import { Injectable } from '@angular/core';
import { SistraReportData } from '@app/views/demand-new/models/sistra-report.types';

@Injectable({
  providedIn: 'root',
})
export class SistraReportService {
  generate(data: SistraReportData): string {
    const text = (value: unknown, fallback = 'No informada'): string => {
      const result = String(value ?? '').trim();
      return result || fallback;
    };
    const citationBlock = (
      title: string,
      citation: SistraReportData['firstCitationFirstInterview'],
    ): string => `
      <div class="section-title citation-title">${title}</div>

      <table class="citation-table">
        <colgroup>
          <col style="width: 7%;" />
          <col style="width: 11%;" />
          <col style="width: 25%;" />
          <col style="width: 17%;" />
          <col style="width: 6%;" />
          <col style="width: 8%;" />
          <col style="width: 12%;" />
          <col style="width: 14%;" />
        </colgroup>
        <tr>
          <th>FECHA</th>
          <td>${text(citation.date, '')}</td>
          <th>${text(citation.professional, '')}</th>
          <td>${text(citation.profession, '')}</td>
          <th>HORA</th>
          <td>${text(citation.time, '')}</td>
          <th>ASISTENCIA</th>
          <td>${text(citation.attendance, '')}</td>
        </tr>
      </table>
    `;

    return `
      <div class="sistra-report">
        <div class="report-header">
          <div class="report-header-logo">
            <img
              class="report-logo"
              src="/assets/logoSSM.png"
              alt="Servicio de Salud Magallanes"
            />
          </div>

          <h1>Registro de Demanda de Atención de Tratamiento de Drogas</h1>

          <div class="report-header-spacer"></div>
        </div>

        <table>
          <tr>
            <th>NOMBRES</th>
            <td>${text(data.person.names)}</td>
            <th>APELLIDOS</th>
            <td>${text(data.person.surnames)}</td>
          </tr>
          <tr>
            <th>RUT</th>
            <td>${text(data.person.rut)}</td>
            <th>FECHA NACIMIENTO</th>
            <td>${text(data.person.birthDate)}</td>
          </tr>
          <tr>
            <th>EDAD</th>
            <td>${text(data.person.age)}</td>
            <th>COMUNA</th>
            <td>${text(data.person.commune)}</td>
          </tr>
          <tr>
            <th>TELÉFONO</th>
            <td>${text(data.person.phone)}</td>
            <th>SEXO</th>
            <td>${text(data.person.sex)}</td>
          </tr>
          <tr>
            <th>DIRECCIÓN</th>
            <td>${text(data.person.address)}</td>
            <th>CESFAM</th>
            <td>${text(data.person.cesfam)}</td>
          </tr>
        </table>

        <div class="section-title">ANTECEDENTES DE LA DEMANDA</div>

        <table>
          <tr>
            <th>SUSTANCIA PRINCIPAL</th>
            <td>${text(data.demand.primarySubstance)}</td>
            <th>SUSTANCIA SECUNDARIA</th>
            <td>${text(data.demand.secondarySubstances)}</td>
          </tr>
          <tr>
            <th>N.º TRATAMIENTOS PREVIOS</th>
            <td>${data.demand.previousTreatmentNumber ?? 0}</td>
            <th>FECHA SOLICITUD</th>
            <td>${text(data.demand.requestDate)}</td>
          </tr>
          <tr>
            <th>TIPO DE CONTACTO</th>
            <td>${text(data.demand.contactType)}</td>
            <th>QUIÉN SOLICITA</th>
            <td>${text(data.demand.sender)}</td>
          </tr>
          <tr>
            <th>QUIÉN DERIVA</th>
            <td colspan="3">${text(data.demand.diverter)}</td>
          </tr>
        </table>

        ${citationBlock(
          'PRIMERA CITACIÓN A PRIMERA ENTREVISTA',
          data.firstCitationFirstInterview,
        )}

        ${citationBlock(
          'SEGUNDA CITACIÓN A PRIMERA ENTREVISTA',
          data.secondCitationFirstInterview,
        )}

        ${citationBlock(
          'PRIMERA CITACIÓN A SEGUNDA ENTREVISTA',
          data.firstCitationSecondInterview,
        )}

        ${citationBlock(
          'SEGUNDA CITACIÓN A SEGUNDA ENTREVISTA',
          data.secondCitationSecondInterview,
        )}

        ${citationBlock(
          'PRIMERA CITACIÓN A TERCERA ENTREVISTA',
          data.firstCitationThirdInterview,
        )}

        ${citationBlock(
          'SEGUNDA CITACIÓN A TERCERA ENTREVISTA',
          data.secondCitationThirdInterview,
        )}

        ${citationBlock(
          'ENTREVISTA OPCIONAL',
          data.optionalInterview,
        )}

        <div class="section-title">RETROALIMENTACIÓN</div>

        <table class="feedback-table">
          <colgroup>
            <col style="width: 7%;" />
            <col style="width: 11%;" />
            <col style="width: 6%;" />
            <col style="width: 8%;" />
            <col style="width: 11%;" />
            <col style="width: 20%;" />
            <col style="width: 18%;" />
            <col style="width: 19%;" />
          </colgroup>
          <tr>
            <th>FECHA</th>
            <td>${text(data.feedback.date, '')}</td>

            <th>HORA</th>
            <td>${text(data.feedback.time, '')}</td>

            <th>PROFESIONAL</th>
            <td>${text(data.feedback.professional, '')}</td>

            <th>COMPROMISO BIOPSICOSOCIAL</th>
            <td>${text(data.feedback.commitment, '')}</td>
          </tr>
          <tr>
            <th>RESULTADO</th>
            <td colspan="7">${text(data.feedback.result, '')}</td>
          </tr>
        </table>

        <div class="section-title">CIERRE</div>

        <table class="closure-table">
          <colgroup>
            <col style="width: 9%;" />
            <col style="width: 16%;" />
            <col style="width: 12%;" />
            <col style="width: 63%;" />
          </colgroup>
          <tr>
            <th>FECHA</th>
            <td>${text(data.closure.date, '')}</td>
            <th>MOTIVO</th>
            <td>${text(data.closure.reason, '')}</td>
          </tr>
        </table>

        <table class="responsible-table">
          <colgroup>
            <col style="width: 15%;" />
            <col style="width: 85%;" />
          </colgroup>
          <tr>
            <th>RESPONSABLE</th>
            <td>${text(data.closure.responsible, '')}</td>
          </tr>
        </table>

        <div class="section-title">OBSERVACIONES</div>

        <table class="observations-table">
          <tr>
            <td class="observations-cell">${text(data.observations, '')}</td>
          </tr>
        </table>
      </div>
    `;
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
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Formulario SISTRAT</title>

          <style>
            @page {
              size: Letter portrait;
              margin: 4mm 7mm 5mm 25mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #000;
            }

            .sistra-report {
              width: 100%;
              break-inside: avoid-page;
              page-break-inside: avoid;

            }

            .report-header {
              display: grid;
              grid-template-columns: 92px 1fr 92px;
              align-items: center;
              column-gap: 8px;
              margin: 0 0 6px;
            }

            .report-header-logo {
              display: flex;
              align-items: center;
              justify-content: flex-start;
            }

            .report-header-spacer {
              width: 92px;
            }

            .report-logo {
              max-width: 82px;
              max-height: 42px;
              object-fit: contain;
              display: block;
            }

            h1 {
              margin: 0;
              text-align: center;
              font-size: 16px;
              font-weight: 700;
              line-height: 1.1;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              border: 1px solid #000;
              min-height: 22px;
              padding: 4px 5px;
              vertical-align: middle;
            }

            th {
              font-size: 9px;
              text-align: left;
              font-weight: 700;
              background: #f3f3f3;
            }

            td {
              font-size: 10px;
              line-height: 1.15;
            }

            .section-title {
              margin-top: 7px;
              padding: 4px;
              border: 1px solid #000;
              border-bottom: 0;
              text-align: center;
              font-weight: 700;
              font-size: 10px;
              background: #eaeaea;
            }

            .form-row {
              min-height: 32px;$24px;
            }

            .box {
              display: inline-block;
              width: 48px;
              height: 30px;
              border: 1px solid #000;
            }

            .box.year {
              width: 64px;
            }

            .check {
              display: inline-block;
              width: 22px;
              height: 22px;
              border: 1px solid #000;
              vertical-align: middle;
            }

            .nsp-field {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            }

            .line {
              display: inline-block;
              height: 24px;
              border-bottom: 1px solid #000;
            }

            .line.medium {
              width: 135px;
            }

            .line.wide {
              flex: 1;
              min-width: 260px;
            }

            .reason-block {
              border: 1px solid #000;
              border-top: 0;
              padding: 7px 8px 9px;
              min-height: 72px;
            }

            .reason-block > strong {
              display: block;
              margin-bottom: 5px;
            }

            .reason-block .form-row {
              border: 0;
              padding: 2px 0 5px;
              min-height: auto;
            }

            .reason-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 5px 16px;
            }

            .closure-row {
              margin-bottom: 0;
            }
            .citation-second-date-row {
              border-bottom: 0;
              min-height: 38px;
            }

            .professional-row {
              border-bottom: 0;
              min-height: 38px;
            }

            .citation-second-followup-row {
              min-height: 38px;
            }

            .reason-grid {
              row-gap: 12px;
            }

            .closure-row {
              min-height: 42px;
            }
            .feedback-date-row {
              min-height: 38px;
              border-bottom: 0;
            }

            .feedback-professional-row {
              min-height: 42px;
            }

            .closure-date-row {
              min-height: 38px;
              border-bottom: 0;
            }

            .closure-responsible-row {
              min-height: 42px;
            }

            .feedback-professional-row .line.wide,
            .closure-responsible-row .line.wide {
              min-width: 360px;
            }

            .observations-block {
              border: 1px solid #000;
              border-top: 0;
            }

            .observations-title {
              padding: 5px 6px;
              font-size: 10px;
              font-weight: 700;
              border-bottom: 1px solid #000;
            }

            .observations-area {
              min-height: 78px;
            }

            /* SISTRAT Gestión de Demanda */
            .citation-title {
              margin-top: 4px;
              padding: 3px 4px;
              font-size: 9px;
              line-height: 1.08;
            }

            .citation-table th,
            .citation-table td,
            .feedback-table th,
            .feedback-table td,
            .closure-table th,
            .closure-table td,
            .responsible-table td,
            .observations-table td {
              padding: 4px 4px;
              min-height: 0;
              line-height: 1.12;
            }

            .citation-table th,
            .feedback-table th,
            .closure-table th {
              font-size: 7.5px;
            }

            .citation-table td,
            .feedback-table td,
            .closure-table td,
            .responsible-table td,
            .observations-table td {
              font-size: 9px;
            }

            .citation-table,
            .feedback-table,
            .closure-table,
            .responsible-table,
            .observations-table {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .observations-cell {
              height: 42px;
              vertical-align: top;
            }

            .sistra-report {
              width: 100%;
              break-inside: avoid-page;
              page-break-inside: avoid;
            }
          </style>
        </head>

        <body>
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
