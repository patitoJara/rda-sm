import { Injectable } from '@angular/core';

export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  /** Retorna el menú dinámico según el rol activo del usuario */
  getMenuByRole(role: string): MenuItem[] {
    switch ((role || '').toUpperCase()) {
      case 'ADMIN':
        return this.adminMenu();
      case 'ADMINISTRATIVO':
        return this.administrativoMenu();
      case 'SUPERVISOR':
        return this.supervisorMenu();
      default:
        return this.defaultMenu();
    }
  }

  private adminMenu(): MenuItem[] {
    return [
      { title: 'Inicio', icon: 'home', route: '/inicio' },
      { title: 'Dashboard ejecutivo', icon: 'dashboard', route: '/analytics' },
      {
        title: 'Gestión de Demanda',
        icon: 'assignment',
        children: [
          { title: 'Nueva demanda', icon: 'add_circle', route: '/demand' },
          { title: 'Bandeja priorizada', icon: 'table_chart', route: '/demand-list' },
          { title: 'Referencias', icon: 'sync_alt', route: '/transfer' },
        ],
      },
      {
        title: 'Administración',
        icon: 'admin_panel_settings',
        children: [
          {
            title: 'Centro de mantenedores',
            icon: 'settings_suggest',
            route: '/administracion',
          },
        ],
      },
      { title: 'Manual', icon: 'menu_book', route: '/manual' },
      { title: 'Acerca de', icon: 'info', route: '/about' },
    ];
  }

  private administrativoMenu(): MenuItem[] {
    return [
      { title: 'Inicio', icon: 'home', route: '/inicio' },
      {
        title: 'Gestión de Demanda',
        icon: 'assignment',
        children: [
          { title: 'Nueva demanda', icon: 'add_circle', route: '/demand' },
          { title: 'Referencias', icon: 'sync_alt', route: '/transfer' },
        ],
      },
      { title: 'Manual', icon: 'menu_book', route: '/manual' },
    ];
  }

  private supervisorMenu(): MenuItem[] {
    return [
      { title: 'Inicio', icon: 'home', route: '/inicio' },
      { title: 'Dashboard ejecutivo', icon: 'dashboard', route: '/analytics' },
      { title: 'Bandeja priorizada', icon: 'table_chart', route: '/demand-list' },
      { title: 'Manual', icon: 'menu_book', route: '/manual' },
    ];
  }

  private defaultMenu(): MenuItem[] {
    return [{ title: 'Inicio', icon: 'home', route: '/inicio' }];
  }
}