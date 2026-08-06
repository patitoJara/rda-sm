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
          order: 10,
        },
      },

      // 📊 PANEL ESTRATÉGICO
      {
        path: 'directory-communications',
        loadComponent: () =>
          import(
            './views/directory-communications/directory-communications.component'
          ).then(
            (m) => m.DirectoryCommunicationsComponent,
          ),
        data: {
          module: 'demanda',
          group: 'Principal',
          section: 'main',
          title: 'Directorio y comunicaciones',
          icon: 'contact_mail',
          roles: ['ADMIN'],
          iconColor: '#0f6b75',
          //hidden: true,
        },
      },
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
          hidden: true,
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
          order: 30,
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
          order: 40,
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
          order: 20,
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
          hidden: true,
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
          maintainerGroup: 'Red y programas',
          section: 'maintainer',
          title: 'Programas',
          description: 'Programas de atención, modalidad, ubicación y estado.',
          icon: 'apps',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 10,
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
          maintainerGroup: 'Usuarios y permisos',
          section: 'maintainer',
          title: 'Usuarios',
          description:
            'Usuarios del sistema, datos de acceso, roles y programas.',
          icon: 'group',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Acceso',
          order: 300,
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
          maintainerGroup: 'Usuarios y permisos',
          section: 'maintainer',
          title: 'Roles',
          description: 'Perfiles y permisos disponibles en el sistema.',
          icon: 'admin_panel_settings',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Permisos',
          order: 310,
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
          maintainerGroup: 'Red y programas',
          section: 'maintainer',
          title: 'Profesiones',
          description: 'Profesiones asociadas a usuarios y atenciones.',
          icon: 'badge',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 30,
        },
      },

      {
        path: 'program-professionals',
        loadComponent: () =>
          import('./views/program-professionals/program-professionals.component').then(
            (m) => m.ProgramProfessionalsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Red y programas',
          section: 'maintainer',
          title: 'Facultativos',
          description:
            'Profesionales y facultativos asociados a programas para citaciones y atenciones.',
          icon: 'medical_services',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 40,
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
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Sustancias',
          description: 'Catálogo de sustancias principales y secundarias.',
          icon: 'science',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 124,
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
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Estados',
          description: 'Estados generales de la demanda o episodio.',
          icon: 'fact_check',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 100,
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
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Resultados',
          description: 'Resultados de evaluación, gestión, cierre o egreso.',
          icon: 'flag',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 110,
        },
      },

      {
        path: 'attendance-statuses',
        loadComponent: () =>
          import('./views/attendance-statuses/attendance-statuses.component').then(
            (m) => m.AttendanceStatusesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Estados de asistencia',
          description:
            'Estados y resultados asociados a citaciones y asistencias.',
          icon: 'event_available',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 115,
        },
      },

      {
        path: 'closure-reasons',
        loadComponent: () =>
          import('./views/closure-reasons/closure-reasons.component').then(
            (m) => m.ClosureReasonsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Causales de cierre',
          description:
            'Causales utilizadas para cerrar formalmente un episodio de demanda.',
          icon: 'lock',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 116,
        },
      },

      {
        path: 'event-types',
        loadComponent: () =>
          import('./views/event-types/event-types.component').then(
            (m) => m.EventTypesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Tipos de eventos',
          description:
            'Tipos de actividades y actuaciones registradas en el historial del episodio.',
          icon: 'event_note',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 117,
        },
      },

      {
        path: 'document-types',
        loadComponent: () =>
          import('./views/document-types/document-types.component').then(
            (m) => m.DocumentTypesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Tipos de documento',
          description:
            'Tipos de documentos asociados a la gestión y respaldo de los episodios.',
          icon: 'description',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 118,
        },
      },

      {
        path: 'program-populations',
        loadComponent: () =>
          import('./views/program-populations/program-populations.component').then(
            (m) => m.ProgramPopulationsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Poblaciones de programa',
          description:
            'Poblaciones objetivo utilizadas para clasificar y configurar los programas de atención.',
          icon: 'groups',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 119,
        },
      },

      {
        path: 'program-modalities',
        loadComponent: () =>
          import('./views/program-modalities/program-modalities.component').then(
            (m) => m.ProgramModalitiesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Modalidades de programa',
          description:
            'Modalidades de atención utilizadas para configurar los programas.',
          icon: 'domain',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 120,
        },
      },

      {
        path: 'program-plans',
        loadComponent: () =>
          import('./views/program-plans/program-plans.component').then(
            (m) => m.ProgramPlansComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Planes de programa',
          description:
            'Planes de atención utilizados para configurar y clasificar los programas.',
          icon: 'assignment',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 121,
        },
      },

      {
        path: 'regions',
        loadComponent: () =>
          import('./views/regions/regions.component').then(
            (m) => m.RegionsComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Red y programas',
          section: 'maintainer',
          title: 'Regiones',
          description:
            'Regiones utilizadas para identificar la ubicación territorial de los programas.',
          icon: 'map',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 50,
        },
      },

      {
        path: 'commune',
        redirectTo: 'cities',
        pathMatch: 'full',
        data: {
          hidden: true,
        },
      },

      {
        path: 'cities',
        loadComponent: () =>
          import('./views/cities/cities.component').then(
            (m) => m.CitiesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Red y programas',
          section: 'maintainer',
          title: 'Comunas por región',
          description:
            'Catálogo nacional de comunas asociadas a su región, utilizado en los datos de personas y en la configuración territorial del sistema.',
          icon: 'location_city',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 60,
        },
      },

      {
        path: 'episode-types',
        loadComponent: () =>
          import('./views/episode-types/episode-types.component').then(
            (m) => m.EpisodeTypesComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'Tipos de episodio',
          description:
            'Primera solicitud, nueva demanda posterior a egreso o cierre.',
          icon: 'dynamic_feed',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Nuevo',
          order: 140,
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
          maintainerGroup: 'Vía de ingreso',
          section: 'maintainer',
          title: 'Quién deriva',
          description: 'Catálogo de entidades o personas derivadoras.',
          icon: 'psychology',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Referencia',
          order: 210,
        },
      },

      {
        path: 'int-prev',
        loadComponent: () =>
          import('./views/intprev/int-prev.component').then(
            (m) => m.IntPrevComponent,
          ),
        canActivate: [roleGuard],
        data: {
          module: 'administracion',
          group: 'Mantenedores',
          maintainerGroup: 'Vía de ingreso',
          section: 'maintainer',
          title: 'Tipos de previsión',
          description:
            'Tipos generales de previsión de salud usados por los convenios.',
          icon: 'health_and_safety',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Previsión',
          order: 225,
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
          maintainerGroup: 'Vía de ingreso',
          section: 'maintainer',
          title: 'Convenios previsionales',
          description:
            'Convenios o planes asociados a un tipo de previsión de salud.',
          icon: 'medical_services',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Convenio',
          order: 230,
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
          maintainerGroup: 'Vía de ingreso',
          section: 'maintainer',
          title: 'Quién solicita',
          description: 'Catálogo de solicitantes o remitentes.',
          icon: 'diversity_3',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Solicitud',
          order: 220,
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
          maintainerGroup: 'Vía de ingreso',
          section: 'maintainer',
          title: 'Tipo de contacto',
          description: 'Canales o formas de contacto con la red.',
          icon: 'support_agent',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Ingreso',
          order: 200,
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
          maintainerGroup: 'Gestión de demanda',
          section: 'maintainer',
          title: 'No relevantes',
          description:
            'Causales para solicitudes que no corresponden al flujo de demanda.',
          icon: 'block',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Actual',
          order: 130,
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
          maintainerGroup: 'Usuarios y permisos',
          section: 'maintainer',
          title: 'Género',
          description: 'Catálogo base de género/sexo para datos de persona.',
          icon: 'wc',
          roles: ['ADMIN'],
          iconColor: '#455a64',
          tag: 'Persona',
          order: 320,
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
