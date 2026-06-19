import { Routes } from '@angular/router';
import { LoginComponent } from './views/login/login.component';
import { TemplateComponent } from './layout/template/template.component';
import { AboutPublicComponent } from './views/about/about-public/about-public.component';
import { AboutPrivateComponent } from './views/about/about-private/about-private.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
  // 🔓 RUTAS PÚBLICAS
  { path: 'auth/login', component: LoginComponent },

  {
    path: 'auth/recover',
    loadComponent: () =>
      import('./views/auth/recover/recover.component').then(
        (m) => m.RecoverComponent,
      ),
  },

  {
    path: 'auth/change-password',
    loadComponent: () =>
      import('./views/auth/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
  },

  { path: 'about-public', component: AboutPublicComponent },

  // 🚀 INICIO DE LA APP
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },

  // 🔐 LAYOUT PRINCIPAL PROTEGIDO
  {
    path: '',
    component: TemplateComponent,
    canActivate: [authGuard],
    children: [
      // 🏠 INICIO (bienvenida + dashboard)
      {
        path: 'inicio',
        loadComponent: () =>
          import('./views/inicio/inicio.component').then(
            (m) => m.InicioComponent,
          ),
        data: {
          module: 'demanda',
          group: 'Principal',
          section: 'main',
          title: 'Inicio',
          icon: 'home',
          roles: [],
          iconColor: '#0f6b75',
        },
      },

      // 📊 PANEL ESTRATÉGICO
      {
        path: 'analytics',
        loadComponent: () =>
          import('./views/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'demanda',
          group: 'Principal',
          section: 'main',
          title: 'Panel Estratégico',
          icon: 'insights',
          roles: ['ADMIN', 'SUPERVISOR'],
          iconColor: '#1565c0',
        },
      },

      // 👤 PERFIL
      {
        path: 'profile',
        loadComponent: () =>
          import('./views/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
        data: {
          module: 'sistema',
          group: 'Usuario',
          section: 'private',
          title: 'Perfil',
          icon: 'account_circle',
          roles: [],
          iconColor: '#607d8b',
          hidden: true,
        },
      },

      // 📖 MANUAL
      {
        path: 'manual',
        loadComponent: () =>
          import('./views/manual/manual.component').then(
            (m) => m.ManualComponent,
          ),
        data: {
          module: 'demanda',
          group: 'Principal',
          section: 'main',
          title: 'Manual',
          icon: 'menu_book',
          roles: [],
          iconColor: '#6a1b9a',
        },
      },

      // ⚙️ ADMINISTRACIÓN DEL SISTEMA
      {
        path: 'administracion',
        loadComponent: () =>
          import('./views/admin-maintainers/admin-maintainers.component').then(
            (m) => m.AdminMaintainersComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Administración',
          section: 'main',
          title: 'Administración',
          icon: 'settings_suggest',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'demand-new',
        loadComponent: () =>
          import('./views/demand-new/demand-new.component').then(
            (m) => m.DemandNewComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'demanda',
          group: 'Demanda',
          section: 'main',
          title: 'Gestión de Demanda',
          icon: 'account_tree',
          roles: ['ADMIN', 'ADMINISTRATIVO'],
          iconColor: '#0f6b75',
        },
      },

      {
        path: 'demand',
        loadComponent: () =>
          import('./views/demand/demand.component').then(
            (m) => m.DemandComponent,
          ),
        canActivate: [roleGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          module: 'demanda',
          group: 'Demanda',
          section: 'legacy',
          title: 'Demanda anterior',
          icon: 'assignment_add',
          roles: ['ADMIN', 'ADMINISTRATIVO'],
          iconColor: '#607d8b',
          hidden: true,
        },
      },

      {
        path: 'demand-list',
        loadComponent: () =>
          import('./views/demand-list/demand-list.component').then(
            (m) => m.DemandListComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'demanda',
          group: 'Demanda',
          section: 'main',
          title: 'Listado de Demandas',
          icon: 'list_alt',
          roles: ['ADMIN', 'SUPERVISOR'],
          iconColor: '#1565c0',
        },
      },

      {
        path: 'transfer',
        loadComponent: () =>
          import('./views/transfer/transfer.component').then(
            (m) => m.TransferComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'demanda',
          group: 'Demanda',
          section: 'main',
          title: 'Referencia',
          icon: 'sync_alt',
          roles: ['ADMIN', 'ADMINISTRATIVO'],
          iconColor: '#ef6c00',
        },
      },
      {
        path: 'program',
        loadComponent: () =>
          import('./views/program/program.component').then(
            (m) => m.ProgramComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Programas',
          icon: 'apps',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'user',
        loadComponent: () =>
          import('./views/users/users.component').then((m) => m.UsersComponent),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Usuarios',
          icon: 'group',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'roles',
        loadComponent: () =>
          import('./views/roles/roles.component').then((m) => m.RoleComponent),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Roles',
          icon: 'admin_panel_settings',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'commune',
        loadComponent: () =>
          import('./views/communes/communes.component').then(
            (m) => m.CommunesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Comunas',
          icon: 'location_city',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'professions',
        loadComponent: () =>
          import('./views/professions/professions.component').then(
            (m) => m.ProfessionsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Profesionales',
          icon: 'medication_liquid',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'substances',
        loadComponent: () =>
          import('./views/substances/substances.component').then(
            (m) => m.SubstancesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Sustancias',
          icon: 'science',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'states',
        loadComponent: () =>
          import('./views/states/states.component').then(
            (m) => m.StatesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Estados',
          icon: 'fact_check',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'results',
        loadComponent: () =>
          import('./views/results/results.component').then(
            (m) => m.ResultsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Resultados',
          icon: 'flag',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'diverter',
        loadComponent: () =>
          import('./views/diverter/diverter.component').then(
            (m) => m.DiverterComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Quién deriva',
          icon: 'psychology',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'conv-prev',
        loadComponent: () =>
          import('./views/convprev/conv-prev.component').then(
            (m) => m.ConvPrevComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Cobertura de salud',
          icon: 'medical_services',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'senders',
        loadComponent: () =>
          import('./views/senders/senders.component').then(
            (m) => m.SendersComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Quién solicita',
          icon: 'diversity_3',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'typecontact',
        loadComponent: () =>
          import('./views/contact.type/contact.type').then(
            (m) => m.TypeContactComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Tipo de contacto',
          icon: 'support_agent',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'not-relevants',
        loadComponent: () =>
          import('./views/not.relevants/not-relevants.component').then(
            (m) => m.NotRelevantsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'No relevantes',
          icon: 'block',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },

      {
        path: 'sexs',
        loadComponent: () =>
          import('./views/sexs/sexs.component').then((m) => m.SexsComponent),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          section: 'maintainer',
          title: 'Género',
          icon: 'wc',
          roles: ['ADMIN'],
          iconColor: '#455a64',
        },
      },
      // ℹ️ ABOUT PRIVADO
      {
        path: 'about',
        component: AboutPrivateComponent,
        canActivate: [roleGuard],
        data: {
          module: 'sistema',
          group: 'Sistema',
          section: 'private',
          title: 'Acerca del sistema',
          icon: 'info',
          roles: ['ADMIN', 'ADMINISTRATIVO', 'OPERADOR', 'SUPERVISOR'],
          iconColor: '#607d8b',
          hidden: true,
        },
      },
    ],
  },

  // 🚫 RUTA DESCONOCIDA
  { path: '**', redirectTo: 'auth/login' },
];
