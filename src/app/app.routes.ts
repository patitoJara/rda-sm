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
      },

      // 📊 PANEL ESTRATÉGICO
      {
        path: 'analytics',
        loadComponent: () =>
          import('./views/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR'] },
      },

      // 👤 PERFIL
      {
        path: 'profile',
        loadComponent: () =>
          import('./views/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },

      // 📖 MANUAL
      {
        path: 'manual',
        loadComponent: () =>
          import('./views/manual/manual.component').then(
            (m) => m.ManualComponent,
          ),
      },

      // ⚙️ ADMINISTRACIÓN DEL SISTEMA
      {
        path: 'administracion',
        loadComponent: () =>
          import('./views/admin-maintainers/admin-maintainers.component').then(
            (m) => m.AdminMaintainersComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      // 🔹 DEMANDA
      {
        path: 'demand',
        loadComponent: () =>
          import('./views/demand/demand.component').then(
            (m) => m.DemandComponent,
          ),
        canActivate: [roleGuard],
        canDeactivate: [pendingChangesGuard],
        data: { roles: ['ADMIN', 'ADMINISTRATIVO'] },
      },

      {
        path: 'transfer',
        loadComponent: () =>
          import('./views/transfer/transfer.component').then(
            (m) => m.TransferComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'ADMINISTRATIVO'] },
      },

      {
        path: 'demand-list',
        loadComponent: () =>
          import('./views/demand-list/demand-list.component').then(
            (m) => m.DemandListComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR'] },
      },

      // 👥 USUARIOS
      {
        path: 'user',
        loadComponent: () =>
          import('./views/users/users.component').then((m) => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'roles',
        loadComponent: () =>
          import('./views/roles/roles.component').then((m) => m.RoleComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      // ⚙️ CONFIGURACIÓN
      {
        path: 'commune',
        loadComponent: () =>
          import('./views/communes/communes.component').then(
            (m) => m.CommunesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'results',
        loadComponent: () =>
          import('./views/results/results.component').then(
            (m) => m.ResultsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'professions',
        loadComponent: () =>
          import('./views/professions/professions.component').then(
            (m) => m.ProfessionsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'program',
        loadComponent: () =>
          import('./views/program/program.component').then(
            (m) => m.ProgramComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'substances',
        loadComponent: () =>
          import('./views/substances/substances.component').then(
            (m) => m.SubstancesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'states',
        loadComponent: () =>
          import('./views/states/states.component').then(
            (m) => m.StatesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'diverter',
        loadComponent: () =>
          import('./views/diverter/diverter.component').then(
            (m) => m.DiverterComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'conv-prev',
        loadComponent: () =>
          import('./views/convprev/conv-prev.component').then(
            (m) => m.ConvPrevComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'senders',
        loadComponent: () =>
          import('./views/senders/senders.component').then(
            (m) => m.SendersComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'typecontact',
        loadComponent: () =>
          import('./views/contact.type/contact.type').then(
            (m) => m.TypeContactComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'not-relevants',
        loadComponent: () =>
          import('./views/not.relevants/not-relevants.component').then(
            (m) => m.NotRelevantsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      {
        path: 'sexs',
        loadComponent: () =>
          import('./views/sexs/sexs.component').then((m) => m.SexsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },

      // ℹ️ ABOUT PRIVADO
      {
        path: 'about',
        component: AboutPrivateComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'ADMINISTRATIVO', 'OPERADOR'] },
      },
    ],
  },

  // 🚫 RUTA DESCONOCIDA
  { path: '**', redirectTo: 'auth/login' },
];
