import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Route, Router, RouterModule } from '@angular/router';

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
  group: string;
  order: number;
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
export class AdminMaintainersComponent implements OnInit {
  constructor(
    private router: Router,
    private zone: NgZone,
  ) {}

  search = '';
  private navigatingRoute: string | null = null;

  groups: MaintainerGroup[] = [];

  ngOnInit(): void {
    this.groups = this.buildMaintainerGroups();
  }

  private buildMaintainerGroups(): MaintainerGroup[] {
    const protectedLayout = this.router.config.find((route) =>
      route.children?.some((child) => child.data?.['section'] === 'maintainer'),
    );

    const children = protectedLayout?.children ?? [];

    const maintainers = children
      .filter((route) => route.data?.['section'] === 'maintainer')
      .filter((route) => !route.data?.['hidden'])
      .map((route) => this.routeToMaintainerItem(route))
      .sort((a, b) => a.order - b.order);

    const grouped = new Map<string, MaintainerItem[]>();

    for (const item of maintainers) {
      const groupName = item.group || 'Mantenedores';

      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
      }

      grouped.get(groupName)?.push(item);
    }

    return Array.from(grouped.entries()).map(([title, items]) => ({
      title,
      subtitle: this.getGroupSubtitle(title),
      icon: this.getGroupIcon(title),
      items,
    }));
  }

  private routeToMaintainerItem(route: Route): MaintainerItem {
    const data = route.data ?? {};
    const routePath = route.path ? `/${route.path}` : '';

    return {
      title: String(data['title'] ?? route.path ?? 'Mantenedor'),
      description: String(
        data['description'] ??
          `Administración del mantenedor ${data['title'] ?? route.path}.`,
      ),
      icon: String(data['icon'] ?? 'settings'),
      route: routePath,
      tag: String(data['tag'] ?? 'Actual'),
      group: String(data['maintainerGroup'] ?? data['group'] ?? 'Mantenedores'),
      order: Number(data['order'] ?? 999),
      disabled: !route.path || !!data['disabled'],
    };
  }

  private getGroupSubtitle(group: string): string {
    switch (group) {
      case 'Red y programas':
        return 'Configuración territorial, programas, modalidad y población objetivo.';
      case 'Gestión de demanda':
        return 'Catálogos clínico-operativos para el flujo Persona → Episodio → Etapa → Evento.';
      case 'Vía de ingreso':
        return 'Origen de la solicitud, derivación y contacto inicial.';
      case 'Usuarios y permisos':
        return 'Administración de accesos, roles y datos base.';
      default:
        return 'Catálogos y configuraciones base del sistema.';
    }
  }

  private getGroupIcon(group: string): string {
    switch (group) {
      case 'Red y programas':
        return 'account_tree';
      case 'Gestión de demanda':
        return 'fact_check';
      case 'Vía de ingreso':
        return 'move_to_inbox';
      case 'Usuarios y permisos':
        return 'admin_panel_settings';
      default:
        return 'settings_suggest';
    }
  }

  get filteredGroups(): MaintainerGroup[] {
    const value = this.normalize(this.search);

    if (!value) {
      return this.groups;
    }

    return this.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const text = `${item.title} ${item.description} ${item.tag} ${item.group}`;
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
