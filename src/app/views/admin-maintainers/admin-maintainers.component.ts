import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
  search = '';

  groups: MaintainerGroup[] = [
    {
      title: 'Red y programas',
      subtitle: 'Configuración territorial, programas y equipos asociados.',
      icon: 'account_tree',
      items: [
        {
          title: 'Programas',
          description: 'Programas de atención, modalidad, ubicación y estado.',
          icon: 'business',
          route: '/program',
          tag: 'Red',
        },
        {
          title: 'Comunas',
          description: 'Catálogo territorial utilizado en personas y programas.',
          icon: 'location_city',
          route: '/commune',
          tag: 'Territorio',
        },
        {
          title: 'Profesiones',
          description: 'Profesiones asociadas a usuarios y atenciones.',
          icon: 'badge',
          route: '/professions',
          tag: 'Equipo',
        },
      ],
    },
    {
      title: 'Gestión de demanda',
      subtitle: 'Catálogos clínico-operativos para el flujo de demanda.',
      icon: 'fact_check',
      items: [
        {
          title: 'Estados',
          description: 'Estados generales de la demanda o episodio.',
          icon: 'flag',
          route: '/states',
          tag: 'Estado',
        },
        {
          title: 'Resultados',
          description: 'Resultados de evaluación, gestión o cierre.',
          icon: 'task_alt',
          route: '/results',
          tag: 'Resultado',
        },
        {
          title: 'Sustancias',
          description: 'Catálogo de sustancias principales y secundarias.',
          icon: 'medication',
          route: '/substances',
          tag: 'Catálogo',
        },
        {
          title: 'No relevantes',
          description: 'Causales o registros asociados a no correspondencia.',
          icon: 'block',
          route: '/not-relevants',
          tag: 'Cierre',
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

  private normalize(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}