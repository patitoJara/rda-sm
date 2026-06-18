import {
  Component,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay, interval, Subscription } from 'rxjs';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TokenService } from '../../services/token.service';
import { AuthLoginService } from '../../services/auth.login.service';
import { routes } from '../../app.routes';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { firstValueFrom } from 'rxjs';
import { NavigationStateService } from '@app/core/services/navigation-state.service';
import { SessionService } from '@app/core/services/session.service';
import { DashboardComponent } from '../../views/dashboard/dashboard.component';

let globalReloadListenerAdded = false;

function registerGlobalReloadListener(callback: (e: any) => void) {
  if (!globalReloadListenerAdded) {
    window.addEventListener('reloadSession', callback);
    globalReloadListenerAdded = true;
  }
}

@Component({
  selector: 'app-template',
  standalone: true,
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.scss'],
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    FormsModule,
  ],
})
export class TemplateComponent implements OnInit {
  private dialog = inject(MatDialog);
  @ViewChild('drawer') drawer!: MatSidenav;
  mantenedoresOpen = true;
  private navState = inject(NavigationStateService);
  private restored = false;
  constructor() {}

  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private tokenService = inject(TokenService);
  private auth = inject(AuthLoginService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private isLoggingOut = false;
  private expirationRetryCount = 0;
  private readonly MAX_EXP_RETRIES = 5;
  private sessionService = inject(SessionService);

  userRoles: string[] = [];
  userPrograms: string[] = [];

  activeRole: string | null = null;
  userFullName: string | null = 'Usuario';
  activeProgram: string | null = null;

  menuItems: any[] = [];
  mantenedorItems: any[] = []; // 👈 ESTA ES LA QUE FALTA
  menuVisible = false;
  isLoading = false;

  remainingMinutes: number = 60;
  private timerSub?: Subscription;
  showExtendButton = false;
  isRefreshing = false;

  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe([Breakpoints.Handset])
    .pipe(
      map((r) => r.matches),
      shareReplay(),
    );

  isSessionReady: boolean = false;

  ngOnInit(): void {
    // Listener global que jamás se duplicará
    registerGlobalReloadListener((e: any) => {
      console.log(
        '[TemplateComponent] 🔄 reloadSession recibido desde:',
        e.detail,
      );
      this.loadSessionData();
    });

    this.loadSessionData();
  }

  loadSessionData(): void {
    const profile = this.tokenService.getUserProfile();

    if (!profile) {
      console.warn(
        '[TemplateComponent] ⚠️ Perfil aún no cargado. Esperando login...',
      );
      return;
    }

    // =============================================
    // 🟦 PERFIL
    // =============================================
    this.userFullName = profile.fullName || profile.firstName || 'Usuario';

    // =============================================
    // 🟦 ROLES → prioridad: tokenService → profile → []
    // =============================================
    const rolesFromToken = this.tokenService.getUserRoles();

    this.userRoles =
      rolesFromToken.length > 0 ? rolesFromToken : (profile.roles ?? []);

    // =============================================
    // 🟦 PROGRAMAS → prioridad: profile → tokenService
    // =============================================
    const rawPrograms =
      profile.programs && profile.programs.length > 0
        ? profile.programs // objetos con id
        : this.tokenService.getUserPrograms(); // strings del token

    // Normalizamos a nombres (string)
    this.userPrograms = rawPrograms.map((p: any) => p.name ?? p);

    // =============================================
    // 🟦 ACTIVO (rol + programa)
    // =============================================
    this.activeRole =
      this.tokenService.getActiveRole() || this.userRoles[0] || null;

    this.activeProgram =
      this.tokenService.getActiveProgram() || this.userPrograms[0] || null;

    // =============================================
    // 🆕 SINCRONIZAR ID DEL PROGRAMA ACTIVO
    // =============================================

    console.log(
      '🔎 DEBUG — profile.programs 167:',
      this.tokenService.getActiveProgramId(),
    );
    console.log('🔎 DEBUG — activeProgram actual:', this.activeProgram);

    if (profile?.programs?.length && this.activeProgram) {
      const selectedProgram = profile.programs.find(
        (p: any) => p.name === this.activeProgram,
      );

      if (selectedProgram?.id) {
        this.tokenService.setActiveProgramId(selectedProgram.id);

        console.log(
          '💾 ID sincronizado automáticamente:',
          this.tokenService.getActiveProgramId(),
        );
      } else {
        console.warn('⚠️ No se encontró ID, aplicando fallback');

        const firstProgram = profile.programs[0];

        if (firstProgram?.id) {
          this.tokenService.setActiveProgramId(firstProgram.id);
          this.tokenService.setActiveProgram(firstProgram.name);
          this.activeProgram = firstProgram.name;

          console.log(
            '💾 ID guardado por fallback:',
            this.tokenService.getActiveProgramId(),
          );
        } else {
          console.error('❌ No existen programas válidos en profile');
        }
      }
    }

    // =============================================
    // 🟦 CONTINUAR FLUJO NORMAL
    // =============================================
    this.isSessionReady = true;
    this.restoreLastRoute();

    this.sessionService.startSessionFromToken();
    this.startRealExpirationTimer();

    this.cdr.detectChanges();
  }

  startTimer(minutes: number): void {
    this.remainingMinutes = minutes;
    this.showExtendButton = false;

    if (this.timerSub) this.timerSub.unsubscribe();

    this.timerSub = interval(60000).subscribe(() => {
      if (this.remainingMinutes > 0) {
        this.remainingMinutes--;
        this.showExtendButton = this.remainingMinutes <= 3;
      }

      if (this.remainingMinutes === 0) {
        this.handleSessionTimeout();
      }

      this.cdr.detectChanges();
    });
  }

  async extendSession(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      this.snackBar.open('🔄 Renovando sesión...', '', { duration: 2000 });

      await firstValueFrom(this.auth.refresh());

      // 🔥 1️⃣ Reiniciar timer central REAL
      this.sessionService.startSessionFromToken();

      // 🔥 2️⃣ Reiniciar contador visual
      this.startRealExpirationTimer();

      this.showExtendButton = false;

      this.snackBar.open('✅ Sesión extendida correctamente', '', {
        duration: 2000,
      });
    } catch {
      // logout lo maneja AuthLoginService
    } finally {
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  }

  private handleSessionTimeout(): void {
    this.snackBar.open('⏰ Sesión expirada. Cerrando...', '', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['mat-mdc-snack-bar-error'],
    });
    this.logout();
  }

  onContinue(): void {
    console.log('================= 🚀 ON CONTINUE =================');

    if (this.isLoading) {
      console.log('⛔ Ya está cargando, se ignora click.');
      return;
    }

    this.isLoading = true;

    console.log('👤 Usuario:', this.userFullName);
    console.log('🎭 Rol seleccionado:', this.activeRole);
    console.log('🏥 Programa seleccionado:', this.activeProgram);

    const profile = this.tokenService.getUserProfile();
    const isSystemAdmin = profile?.email === 'admin@demo.com';

    // ===================================================
    // 💾 GUARDAR ROL Y PROGRAMA (NOMBRE PRIMERO)
    // ===================================================
    this.tokenService.setActiveRole(this.activeRole || '');
    this.tokenService.setActiveProgram(this.activeProgram || '');

    console.log('💾 Rol guardado:', this.tokenService.getActiveRole());
    console.log('💾 Programa guardado:', this.tokenService.getActiveProgram());

    // ===================================================
    // 🔎 VALIDACIÓN + ASIGNACIÓN ID
    // ===================================================
    if (!isSystemAdmin) {
      if (!this.activeRole || !this.activeProgram) {
        console.warn('⚠️ Falta rol o programa.');
        alert('⚠️ Debes seleccionar un rol y un programa para continuar.');
        this.isLoading = false;
        return;
      }

      const programs = this.tokenService.getUserPrograms();

      const selectedProgram = programs.find(
        (p) => p.name === this.activeProgram,
      );

      if (selectedProgram?.id) {
        this.tokenService.setActiveProgramId(selectedProgram.id);
        console.log('🆔 ID guardado correctamente:', selectedProgram.id);
      } else {
        console.warn('⚠️ No se encontró ID para el programa.');
        this.tokenService.setActiveProgramId(null);
      }
    } else {
      // 🔵 ADMIN ESTRUCTURAL
      this.tokenService.setActiveProgramId(null);
      console.log('👑 Admin estructural sin programa.');
    }

    // ===================================================
    // 🔍 VALIDACIÓN FINAL
    // ===================================================
    console.log(
      '📦 activeProgramId final:',
      this.tokenService.getActiveProgramId(),
    );

    console.log('================= ✅ CONTEXTO LISTO =================');

    // ===================================================
    // 🚀 CONTINUAR AL SISTEMA
    // ===================================================
    this.buildMenu();

    setTimeout(() => {
      this.menuVisible = true;
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log('🎉 Menú visible, sesión inicializada correctamente.');
    }, 250);
  }

  buildMenu(): void {
    const role = (this.activeRole || '').toUpperCase();

    const baseMenu: any[] = [
      { title: 'Inicio', icon: 'home', route: '/inicio' },
    ];

    const mainRoute = routes.find((r) => r.children);
    const childRoutes = mainRoute?.children ?? [];

    for (const route of childRoutes) {
      if (
        !route.path ||
        ['', '**', 'inicio'].includes(route.path) ||
        this.HIDDEN_MENU_PATHS.includes(route.path) ||
        this.MANTENEDOR_PATHS.includes(route.path)
      ) {
        continue;
      }

      const allowedRoles = route.data?.['roles'] ?? [];
      const visible = allowedRoles.length === 0 || allowedRoles.includes(role);

      if (!visible) continue;

      baseMenu.push({
        title: this.getTitleFromPath(route.path),
        icon: this.getIcon(route.path),
        route: '/' + route.path,
        path: route.path,
      });
    }

    this.menuItems = baseMenu;
    this.mantenedorItems = [];
  }

  private readonly HIDDEN_MENU_PATHS: string[] = ['profile'];

  private readonly MANTENEDOR_PATHS = [
    'user',
    'roles',
    'commune',
    'program',
    'professions',
    'substances',
    'states',
    'results',
    'diverter',
    'conv-prev',
    'senders',
    'typecontact',
    'not-relevants',
    'sexs',
  ];

  isMantenedor(route: string): boolean {
    const mantenedores = [
      '/user',
      '/roles',
      '/commune',
      '/program',
      '/professions',
      '/substances',
      '/states',
      '/results',
      '/diverter',
      '/conv-prev',
      '/senders',
      '/typecontact',
      '/not-relevants',
      '/sexs',
    ];
    return mantenedores.includes(route);
  }

  hasMantenedores(): boolean {
    return this.menuItems.some((item) => this.isMantenedor(item.route));
  }
  private getIcon(path: string): string {
    const icons: any = {
      user: 'group',
      roles: 'admin_panel_settings',
      program: 'apps',
      commune: 'location_city',
      demand: 'assignment_add',
      transfer: 'sync_alt',
      substances: 'science',
      states: 'fact_check',
      professions: 'medication_liquid',
      results: 'flag',
      diverter: 'psychology',
      IntPrevComponent: 'medical_information',
      senders: 'diversity_3',
      typecontact: 'support_agent',
      'conv-prev': 'medical_services',
      'not-relevants': 'block',
      'demand-list': 'list_alt',
      sexs: 'wc',
      about: 'info',
      manual: 'menu_book',
      analytics: 'insights',
      administracion: 'settings_suggest',
    };

    return icons[path] || 'chevron_right';
  }

  private getTitleFromPath(path: string): string {
    const titles: Record<string, string> = {
      inicio: 'Inicio',
      manual: 'Manual',
      administracion: 'Administración',
      demand: 'Demandas',
      transfer: 'Referencia',
      'demand-list': 'Listado de Demandas',
      user: 'Usuarios',
      roles: 'Roles',
      commune: 'Comunas',
      program: 'Programas',
      professions: 'Profesionales',
      substances: 'Sustancias',
      states: 'Estado',
      results: 'Resultado',
      diverter: 'Quien Deriva',
      IntPrevComponent: 'Sistema de Salud',
      senders: 'Quien Solicita',
      typecontact: 'Tipo de contacto',
      'conv-prev': 'Covertura de Salud',
      'not-relevants': 'No relevantes',
      sexs: 'Género',
      about: 'Acerca del sistema',
      analytics: 'Panel Estratégico',
    };
    return titles[path] || path.charAt(0).toUpperCase() + path.slice(1);
  }

  toggleDrawer(): void {
    this.drawer.toggle();
  }

  logout(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: 'Salir del Sistema',
          message: 'Esta seguro que desea salir del Sistema ???...',
          confirmText: 'Salir',
          cancelText: 'Volver',
          icon: 'logout',
          color: 'warn',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          if (this.isLoggingOut) return;
          this.isLoggingOut = true;

          if (this.timerSub) {
            this.timerSub.unsubscribe();
            this.timerSub = undefined;
          }

          this.tokenService.clear();
          this.router.navigate(['/auth/login']);
        } else {
          // 🔥 CLAVE ABSOLUTA
          console.log(
            '[TemplateComponent] 🔁 Logout cancelado, reanudando sesión',
          );
          this.startRealExpirationTimer();
        }
      });
  }

  startRealExpirationTimer(): void {
    const exp = this.tokenService.getTokenExpiration();

    if (!exp) {
      console.warn('[TemplateComponent] ⏰ No hay expiración registrada');
      return;
    }

    let remainingMs = exp - Date.now();

    this.remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
    this.showExtendButton = this.remainingMinutes <= 5;

    console.log(
      `[TemplateComponent] ⏲ Sesión expira en ${this.remainingMinutes} minutos`,
    );

    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }

    this.timerSub = interval(60000).subscribe(() => {
      remainingMs = exp - Date.now();
      this.remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));

      this.showExtendButton = this.remainingMinutes <= 5;

      if (this.remainingMinutes <= 0) {
        this.timerSub?.unsubscribe();
        this.timerSub = undefined;
        this.handleSessionTimeout();
        return;
      }

      this.cdr.detectChanges();
    });
  }

  toggleMantenedores(): void {
    this.mantenedoresOpen = !this.mantenedoresOpen;
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  private restoreLastRoute(): void {
    if (this.restored) return;

    const last = this.navState.getLastRoute();

    // ⛔ Protecciones
    if (!last || last === '/inicio' || last.startsWith('/auth')) {
      return;
    }

    this.restored = true;

    // ✅ MOSTRAR LAYOUT
    this.menuVisible = true;

    // ✅ RECONSTRUIR MENÚ (CLAVE)
    this.buildMenu();

    // ✅ NAVEGAR
    this.router.navigateByUrl(last);
  }

  onProgramChange(programName: string): void {
    console.log('🔄 Programa cambiado a:', programName);

    this.activeProgram = programName;

    // Guardar nombre
    this.tokenService.setActiveProgram(programName);

    // Obtener todos los programas (profile o token)
    const profile = this.tokenService.getUserProfile();
    const programsFromToken = this.tokenService.getUserPrograms();

    const allPrograms =
      profile?.programs?.length > 0 ? profile.programs : programsFromToken;

    const selectedProgram = allPrograms.find(
      (p: any) => p.name === programName,
    );

    if (selectedProgram?.id) {
      this.tokenService.setActiveProgramId(selectedProgram.id);
      console.log('🆔 Nuevo ID guardado:', selectedProgram.id);
    } else {
      console.warn('⚠️ No se pudo encontrar ID para el programa');
    }
  }
}
