import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

interface MaintainerItem {
  title: string;
  description: string;
  icon: string;
  route: string;
  tag: string;
  disabled?: boolean;
}

interface MaintainerGroup {
  title: string;
  subtitle: string;
  icon: string;
  items: MaintainerItem[];
}

@Component({
  standalone: true,
  selector: 'app-admin-maintainers',
  templateUrl: './admin-maintainers.component.html',
  styleUrls: ['./admin-maintainers.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
})
export class AdminMaintainersComponent {
  constructor(
    private router: Router,
    private zone: NgZone,
  ) {}

  search = '';
  private navigatingRoute: string | null = null;

  groups: MaintainerGroup[] = [
    {
      title: 'Red y programas',
      subtitle:
        'Configuración territorial, programas, modalidad y población objetivo.',
      icon: 'account_tree',
      items: [
        {
          title: 'Programas',
          description: 'Programas de atención, modalidad, ubicación y estado.',
          icon: 'business',
          route: '/program',
          tag: 'Actual',
        },
        {
          title: 'Comunas',
          description:
            'Catálogo territorial utilizado en personas y programas.',
          icon: 'location_city',
          route: '/commune',
          tag: 'Actual',
        },
        {
          title: 'Profesiones',
          description: 'Profesiones asociadas a usuarios y atenciones.',
          icon: 'badge',
          route: '/professions',
          tag: 'Actual',
        },
        {
          title: 'Regiones',
          description: 'Catálogo regional para ubicación de programas.',
          icon: 'map',
          route: '/regions',
          tag: 'Nuevo',
          disabled: true,
        },
        {
          title: 'Ciudades',
          description: 'Catálogo de ciudades asociado a regiones.',
          icon: 'location_on',
          route: '',
          tag: 'Nuevo',
          disabled: true,
        },
        {
          title: 'Población objetivo',
          description:
            'Adulto, adolescente u otra población definida por programa.',
          icon: 'supervised_user_circle',
          route: '',
          tag: 'Nuevo',
          disabled: true,
        },
        {
          title: 'Modalidades',
          description:
            'Ambulatorio, residencial u otra modalidad del programa.',
          icon: 'home_work',
          route: '',
          tag: 'Nuevo',
          disabled: true,
        },
        {
          title: 'Planes o líneas',
          description:
            'Planes, líneas de atención o convenio asociado al programa.',
          icon: 'schema',
          route: '',
          tag: 'Nuevo',
          disabled: true,
        },
      ],
    },
    {
      title: 'Gestión de demanda',
      subtitle:
        'Catálogos clínico-operativos para el flujo Persona → Episodio → Etapa → Evento.',
      icon: 'fact_check',
      items: [
        {
          title: 'Estados',
          description: 'Estados generales de la demanda o episodio.',
          icon: 'flag',
          route: '/states',
          tag: 'Actual',
        },
        {
          title: 'Resultados',
          description: 'Resultados de evaluación, gestión, cierre o egreso.',
          icon: 'task_alt',
          route: '/results',
          tag: 'Actual',
        },
        {
          title: 'Sustancias',
          description: 'Catálogo de sustancias principales y secundarias.',
          icon: 'science',
          route: '/substances',
          tag: 'Actual',
        },
        {
          title: 'Motivos de cierre',
          description:
            'Causales de cierre, no corresponde, no es perfil e inasistencias.',
          icon: 'block',
          route: '/not-relevants',
          tag: 'Pendiente',
        },
        {
          title: 'Tipos de episodio',
          description:
            'Primera solicitud, nueva demanda posterior a egreso o cierre.',
          icon: 'folder_open',
          route: '/episode-types',
          tag: 'Nuevo',
        },
        {
          title: 'Tipos de evento',
          description:
            'Citación, asistencia, observación, referencia, ingreso, egreso y cierre.',
          icon: 'event_note',
          route: '/event-types',
          tag: 'Nuevo',
        },
        {
          title: 'Estados de asistencia',
          description:
            'Agendado, se presentó, no se presentó, reprogramada o pendiente.',
          icon: 'how_to_reg',
          route: '/attendance-statuses',
          tag: 'Nuevo',
        },
        {
          title: 'Reglas de semáforo',
          description: 'Configuración de días normales, alerta y criticidad.',
          icon: 'traffic',
          route: '/semaphore-rules',
          tag: 'Nuevo',
        },
      ],
    },
    {
      title: 'Vía de ingreso',
      subtitle: 'Origen de la solicitud, derivación y contacto inicial.',
      icon: 'move_to_inbox',
      items: [
        {
          title: 'Tipos de contacto',
          description: 'Canales o formas de contacto con la red.',
          icon: 'category',
          route: '/typecontact',
          tag: 'Ingreso',
        },
        {
          title: 'Quién deriva',
          description: 'Catálogo de entidades o personas derivadoras.',
          icon: 'send',
          route: '/diverter',
          tag: 'Derivación',
        },
        {
          title: 'Quién solicita',
          description: 'Catálogo de solicitantes o remitentes.',
          icon: 'person_add',
          route: '/senders',
          tag: 'Solicitud',
        },
        {
          title: 'Convenios previos',
          description: 'Antecedentes de convenio o coordinación previa.',
          icon: 'handshake',
          route: '/conv-prev',
          tag: 'Convenio',
        },
      ],
    },
    {
      title: 'Usuarios y permisos',
      subtitle: 'Administración de accesos, roles y datos base.',
      icon: 'admin_panel_settings',
      items: [
        {
          title: 'Usuarios',
          description: 'Usuarios del sistema y datos de acceso.',
          icon: 'groups',
          route: '/user',
          tag: 'Acceso',
        },
        {
          title: 'Roles',
          description: 'Perfiles y permisos disponibles en el sistema.',
          icon: 'verified_user',
          route: '/roles',
          tag: 'Permisos',
        },
        {
          title: 'Género',
          description: 'Catálogo base de género/sexo.',
          icon: 'wc',
          route: '/sexs',
          tag: 'Persona',
        },
      ],
    },
  ];

  get filteredGroups(): MaintainerGroup[] {
    const value = this.normalize(this.search);

    if (!value) {
      return this.groups;
    }

    return this.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const text = `${item.title} ${item.description} ${item.tag}`;
          return this.normalize(text).includes(value);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  openMaintainer(item: MaintainerItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (item.disabled || !item.route) {
      return;
    }

    const route = item.route;

    if (this.navigatingRoute === route) {
      return;
    }

    this.navigatingRoute = route;

    this.zone.run(() => {
      Promise.resolve().then(() => {
        void this.router.navigateByUrl(route).finally(() => {
          this.navigatingRoute = null;
        });
      });
    });
  }

  private normalize(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
