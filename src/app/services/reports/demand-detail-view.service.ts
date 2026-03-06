// src/app/services/reports/demand-detail-view.service.ts
import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class DemandDetailViewService {
  constructor() {}

  generate(reg: any, sustancias: any[], movimientos: any[]): void {

    const logoUrl = `${window.location.origin}/assets/logoSSM.png`;
    const fechaAtencion = reg.date_attention
      ? formatDate(reg.date_attention, 'dd/MM/yyyy', 'es-CL')
      : '---';

    const postulante = `${reg.postulant?.firstName ?? ''} ${
      reg.postulant?.lastName ?? ''
    } ${reg.postulant?.firstLastName ?? ''} ${
      reg.postulant?.secondLastName ?? ''
    }`.trim();

    const fechaNacimiento = reg.postulant?.birthdate
      ? formatDate(reg.postulant.birthdate, 'dd-MM-yyyy', 'es-CL')
      : '---';

    const edad = this.calcularEdad(reg.postulant?.birthdate);

    // ======================================================
    // 🧪 NORMALIZAR SUSTANCIAS PARA REPORTE
    // ======================================================
    const sustanciasNormalizadas = (() => {
      // 1️⃣ solo activas
      const activas = sustancias.filter((s) => !s.deletedAt);

      // 2️⃣ quitar duplicados por sustancia.id
      const map = new Map<number, any>();
      activas.forEach((s) => {
        if (s.substance?.id) {
          map.set(s.substance.id, s);
        }
      });

      // 3️⃣ ordenar: Principal primero
      return Array.from(map.values()).sort((a, b) => {
        if (a.level === 'Principal' && b.level !== 'Principal') return -1;
        if (a.level !== 'Principal' && b.level === 'Principal') return 1;
        return 0;
      });
    })();

    const tablaSustancias = sustanciasNormalizadas.length
      ? sustanciasNormalizadas
          .map(
            (s) => `
      <tr>
        <td>${s.level ?? ''}</td>
        <td>${s.substance?.name ?? ''}</td>
      </tr>
    `
          )
          .join('')
      : `
      <tr>
        <td colspan="2" style="text-align:center; font-style: italic;">
          Sin sustancias asociadas
        </td>
      </tr>
    `;

    // ======================================================
    // 🧭 ORDENAR MOVIMIENTOS POR FECHA + HORA
    // ======================================================
    movimientos = movimientos
      .filter((m) => !m.deletedAt)
      .sort((a, b) => {
        const da = new Date(a.date_attention);
        const db = new Date(b.date_attention);

        // set hora manualmente (evita timezone bugs)
        if (a.hour_attention) {
          const [ha, ma] = a.hour_attention.split(':').map(Number);
          da.setHours(ha, ma, 0, 0);
        }

        if (b.hour_attention) {
          const [hb, mb] = b.hour_attention.split(':').map(Number);
          db.setHours(hb, mb, 0, 0);
        }

        return da.getTime() - db.getTime(); // ASC real
      });

    const tablaMovimientos = movimientos.length
      ? movimientos
          .map(
            (m) => `
        <tr>
          <td>${m.profession?.name ?? ''}</td>
          <td>${m.full_name ?? ''}</td>
          <td>${
            m.date_attention
              ? formatDate(m.date_attention, 'dd/MM/yyyy', 'es-CL')
              : ''
          }</td>
          <td>${m.hour_attention ?? ''}</td>
          <td>${m.state ?? ''}</td>
          <!-- <td>${m.id ?? ''}</td> -->
        </tr>
      `
          )
          .join('')
      : `
        <tr>
          <td colspan="6" style="text-align:center; font-style: italic;">
            Sin movimientos registrados
          </td>
        </tr>
      `;

    const html = `

    <html>
    <head>
      <title>Detalle Demanda</title>
      <style>
        body { font-family: Arial; margin: 25px; font-size: 13px; }
        h2, h3 { text-align: center; margin: 0; }
        hr { margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #555; padding: 6px; font-size: 12px; }
        th { background: #f2f2f2; }
        .titulo { font-weight: bold; margin-top: 15px; }
        .observaciones { white-space: pre-line; }


.logo-container {
  margin: 0;
  padding: 0;
}

.logo-container img {
  width: 160px;     /* ajusta tamaño aquí */
  height: auto;
  display: block;
}

      </style>
    </head>

    <body>

        <div class="logo-container">
          <img src="${logoUrl}" class="logo" />
        </div>

      <h2>SERVICIO DE SALUD MAGALLANES</h2>
      <h3>Departamento de Salud Mental</h3>
      <h3>Detalle Demanda</h3>
      <hr>

      <div class="titulo">Programa</div>
      <table>
        <tr>
          <td><b>N° Ficha:</b></td><td>${reg.id}-${reg.program?.id}</td>
          <td><b>Fecha Atención:</b></td><td>${fechaAtencion}</td>
        </tr>
        <tr>
          <td><b>Programa:</b></td><td colspan="3">${
            reg.program?.name ?? '---'
          }</td>
        </tr>
      </table>

      <div class="titulo">Datos Generales</div>
      <table>
        <tr>
          <td><b>Postulante:</b></td><td>${postulante}</td>
          <td><b>Rut:</b></td><td>${reg.postulant?.rut ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Fecha Nacimiento:</b></td><td>${fechaNacimiento} (${edad} años)</td>
          <td><b>Dirección:</b></td><td>${reg.postulant?.address ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Mail:</b></td><td>${reg.postulant?.email ?? '---'}</td>
          <td><b>Celular:</b></td><td>${reg.postulant?.phone ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Comuna:</b></td><td>${
            reg.postulant?.commune?.name ?? '---'
          }</td>
          <td><b>Sexo:</b></td><td>${reg.postulant?.sex?.name ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Previsión:</b></td><td>${
            reg.postulant?.convPrev?.name ?? '---'
          }</td>
          <td><b># Tratamientos:</b></td><td>${reg.number_tto ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Tipo Contacto:</b></td><td>${
            reg.contactType?.name ?? '---'
          }</td>
          <td><b>Quién Solicita:</b></td><td>${reg.sender?.name ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Quién Deriva:</b></td><td>${reg.diverter?.name ?? '---'}</td>
          <td><b>Estado:</b></td><td>${reg.state?.name ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Resultado:</b></td><td>${reg.result?.name ?? '---'}</td>
        </tr>
        <tr>
          <td><b>Observaciones:</b></td><td colspan="3" class="observaciones">${
            reg.description ?? '---'
          }</td>

         
        </tr>
      </table>

      <div class="titulo">Datos del Contacto</div>
      <table>
        ${
          reg.contact
            ? `
              <tr>
                <td><b>Contacto:</b></td><td>${reg.contact.name}</td>
                <td><b>Celular:</b></td><td>${reg.contact.cellphone ?? '---'}</td>
              </tr>
              <tr>
                <td><b>Correo:</b></td><td>${reg.contact.email ?? '---'}</td>
                <td><b>Descripción:</b></td><td>${reg.contact.description ?? '---'}</td>
              </tr>
            `
            : `<tr>
                <td colspan="4" style="text-align:center;">
                  No existe contacto registrado
                </td>
              </tr>`
        }      
      </table>

      <div class="titulo">Sustancias Asociadas</div>
      <table>
        <thead>
          <tr><th>Nivel</th><th>Sustancia</th></tr>
        </thead>
        <tbody>${tablaSustancias}</tbody>
      </table>

      <div class="titulo">Movimientos</div>
      <table>
        <thead>
          <tr>
            <th>Profesión</th><th>Profesional</th><th>Fecha</th>
            <th>Hora</th><th>Estado</th> 
            <!-- <th>ID</th> -->
          </tr>
        </thead>
        <tbody>${tablaMovimientos}</tbody>
      </table>

    </body>
    </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=1000');
    win!.document.open();
    win!.document.write(html);
    win!.document.close();
  }

  private calcularEdad(f: any): number | null {
    if (!f) return null;
    const n = new Date(f);
    const h = new Date();
    let e = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
    return e;
  }
}