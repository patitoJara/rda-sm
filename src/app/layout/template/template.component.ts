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
import { TimeService } from '@app/core/services/time.service';

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
  isAdminUser = false;
  needsContextSelection = false;
  isStructuralAdmin = false;

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
  private timeService = inject(TimeService);

  private readonly PROGRAM_REQUIRED_ROLES = ['ADMINISTRATIVO'];

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
    // 🟦 ROLES
    // =============================================
    const rolesFromToken = this.tokenService.getUserRoles();

    const rawRoles =
      rolesFromToken.length > 0 ? rolesFromToken : (profile.roles ?? []);

    this.userRoles = rawRoles
      .map((role: any) =>
        String(role?.code ?? role?.name ?? role)
          .trim()
          .toUpperCase(),
      )
      .filter((role: string) => !!role);

    // =============================================
    // 🟦 AUTHORITIES / ADMIN
    // =============================================
    const authorities = profile.authorities ?? [];

    this.isAdminUser =
      this.userRoles.some(
        (role) => role === 'ADMIN' || role === 'ROLE_ADMIN',
      ) ||
      authorities.includes('ROLE_ADMIN') ||
      profile?.email === 'admin@demo.com';

    // =============================================
    // 🟦 PROGRAMAS
    // =============================================
    const rawPrograms =
      profile.programs && profile.programs.length > 0
        ? profile.programs
        : this.tokenService.getUserPrograms();

    this.userPrograms = rawPrograms
      .map((program: any) => program?.name ?? program)
      .filter((program: any) => !!program);

    // =============================================
    // 👑 ADMIN ESTRUCTURAL
    // =============================================
    this.isStructuralAdmin =
      profile?.email === 'admin@demo.com' ||
      (this.isAdminUser && this.userPrograms.length === 0);

    if (this.isStructuralAdmin) {
      this.activeRole = 'ADMIN';
      this.activeProgram = null;

      this.tokenService.setActiveRole('ADMIN');
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);

      this.needsContextSelection = false;
      this.menuVisible = true;

      this.buildMenu();

      this.isSessionReady = true;
      this.sessionService.startSessionFromToken();
      this.startRealExpirationTimer();

      this.cdr.detectChanges();

      console.log(
        '[TemplateComponent] 👑 ADMIN estructural entra sin programa.',
      );

      return;
    }

    // =============================================
    // 🟦 USUARIO NORMAL
    // =============================================
    const storedActiveRole = String(this.tokenService.getActiveRole() ?? '')
      .trim()
      .toUpperCase();

    const storedActiveProgram = this.tokenService.getActiveProgram();

    this.activeRole =
      storedActiveRole && this.userRoles.includes(storedActiveRole)
        ? storedActiveRole
        : this.userRoles.length === 1
          ? this.userRoles[0]
          : null;

    if (this.activeRole) {
      this.tokenService.setActiveRole(this.activeRole);
    }

    // Solo conservar o seleccionar programa cuando el rol lo requiere.
    if (this.activeRoleRequiresProgram) {
      this.activeProgram =
        storedActiveProgram && this.userPrograms.includes(storedActiveProgram)
          ? storedActiveProgram
          : this.userPrograms.length === 1
            ? this.userPrograms[0]
            : null;

      if (this.activeProgram) {
        this.tokenService.setActiveProgram(this.activeProgram);

        const selectedProgram = rawPrograms.find(
          (program: any) =>
            program?.name === this.activeProgram ||
            program === this.activeProgram,
        );

        this.tokenService.setActiveProgramId(selectedProgram?.id ?? null);
      } else {
        this.tokenService.setActiveProgram('');
        this.tokenService.setActiveProgramId(null);
      }
    } else {
      // ADMIN, SUPERVISOR, PROFESIONAL y EJECUTIVO.
      this.activeProgram = null;
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);
    }

    // =============================================
    // 🧭 SELECCIÓN DE CONTEXTO
    // =============================================
    this.needsContextSelection =
      this.userRoles.length > 1 ||
      (this.activeRoleRequiresProgram && this.userPrograms.length > 1);

    const contextReady =
      !!this.activeRole &&
      (!this.activeRoleRequiresProgram || !!this.activeProgram);

    if (!this.needsContextSelection && contextReady) {
      this.menuVisible = true;
      this.buildMenu();
    } else {
      this.menuVisible = false;
    }

    this.isSessionReady = true;
    this.sessionService.startSessionFromToken();
    this.startRealExpirationTimer();

    this.cdr.detectChanges();

    console.log('[TemplateComponent] Contexto cargado:', {
      userRoles: this.userRoles,
      userPrograms: this.userPrograms,
      activeRole: this.activeRole,
      activeProgram: this.activeProgram,
      requiresProgram: this.activeRoleRequiresProgram,
      needsContextSelection: this.needsContextSelection,
      menuVisible: this.menuVisible,
    });
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

  private showContextWarning(message: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      data: {
        title: 'Selección requerida',
        message,
        confirmText: 'Aceptar',
        cancelText: '',
        icon: 'warning',
        color: 'warn',
        onlyConfirm: true,
      },
    });
  }

  onContinue(): void {
    console.log('================= 🚀 ON CONTINUE =================');

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    // =============================================
    // 👑 ADMIN ESTRUCTURAL
    // =============================================
    if (this.isStructuralAdmin) {
      this.activeRole = 'ADMIN';
      this.activeProgram = null;

      this.tokenService.setActiveRole('ADMIN');
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);

      this.buildMenu();
      this.menuVisible = true;
      this.isLoading = false;

      this.cdr.detectChanges();

      console.log('👑 ADMIN estructural ingresó sin programa.');
      return;
    }

    // =============================================
    // USUARIO NORMAL
    // =============================================
    if (!this.activeRole) {
      this.showContextWarning('Debes seleccionar un rol para continuar.');
      this.isLoading = false;
      return;
    }

    if (this.activeRoleRequiresProgram && !this.activeProgram) {
      this.showContextWarning(
        'El rol ADMINISTRATIVO requiere seleccionar un programa.',
      );
      this.isLoading = false;
      return;
    }

    this.tokenService.setActiveRole(this.activeRole);

    if (this.activeRoleRequiresProgram && this.activeProgram) {
      this.tokenService.setActiveProgram(this.activeProgram);

      const profile = this.tokenService.getUserProfile();

      const programs =
        profile?.programs?.length > 0
          ? profile.programs
          : this.tokenService.getUserPrograms();

      const selectedProgram = programs.find(
        (program: any) =>
          program?.name === this.activeProgram ||
          program === this.activeProgram,
      );

      if (selectedProgram?.id) {
        this.tokenService.setActiveProgramId(selectedProgram.id);
      } else {
        this.tokenService.setActiveProgramId(null);
      }
    } else {
      // SUPERVISOR, PROFESIONAL, EJECUTIVO y ADMIN sin programa.
      this.activeProgram = null;
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);
    }

    this.buildMenu();

    this.menuVisible = true;
    this.isLoading = false;

    this.cdr.detectChanges();

    console.log('🎉 Contexto listo.', {
      activeRole: this.activeRole,
      activeProgram: this.activeProgram,
      requiresProgram: this.activeRoleRequiresProgram,
    });
  }

  buildMenu(): void {
    const role = (this.activeRole || '').trim().toUpperCase();

    const mainRoute = routes.find((r) => r.children);
    const childRoutes = mainRoute?.children ?? [];

    const baseMenu: any[] = [];
    const mantenedores: any[] = [];

    for (const route of childRoutes) {
      if (!route.path || ['', '**'].includes(route.path)) continue;

      const data = route.data ?? {};

      if (data['hidden']) continue;

      const allowedRoles = (data['roles'] ?? []) as string[];

      const visible =
        role === 'ADMIN' ||
        role === 'ROLE_ADMIN' ||
        allowedRoles.length === 0 ||
        allowedRoles.some((r) => r.trim().toUpperCase() === role);

      if (!visible) continue;

      const item = {
        title: data['title'] || route.path,
        icon: data['icon'] || 'chevron_right',
        route: '/' + route.path,
        path: route.path,
        module: data['module'] || 'demanda',
        group: data['group'] || 'General',
        section: data['section'] || 'main',
        iconColor: data['iconColor'] || '#0f6b75',
        order: Number(data['order'] ?? 999),
      };

      if (item.section === 'maintainer') {
        mantenedores.push(item);
      } else {
        baseMenu.push(item);
      }
    }
    baseMenu.sort((a, b) => a.order - b.order);
    mantenedores.sort((a, b) => a.order - b.order);

    this.menuItems = baseMenu;
    this.mantenedorItems = mantenedores;
  }

  private readonly HIDDEN_MENU_PATHS: string[] = ['profile', 'about'];

  isMantenedor(route: string): boolean {
    return this.mantenedorItems.some((item) => item.route === route);
  }

  hasMantenedores(): boolean {
    return this.mantenedorItems.length > 0;
  }

  toggleDrawer(): void {
    this.drawer.toggle();
  }

  logout(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        disableClose: true,
        panelClass: 'rda-confirm-dialog',
        data: {
          title: 'Cerrar sesión',
          message: '¿Desea cerrar la sesión actual?',
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
      console.warn('[TemplateComponent] No hay expiración registrada');
      return;
    }

    let remainingMs = exp - this.timeService.nowMs();

    this.remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));

    this.showExtendButton = this.remainingMinutes <= 5;

    console.log(
      `[TemplateComponent] Sesión expira en ${this.remainingMinutes} minutos`,
    );

    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }

    this.timerSub = interval(60000).subscribe(() => {
      remainingMs = exp - this.timeService.nowMs();

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

  onRoleChange(role: string): void {
    this.activeRole = String(role ?? '')
      .trim()
      .toUpperCase();

    this.tokenService.setActiveRole(this.activeRole);

    if (!this.activeRoleRequiresProgram) {
      this.activeProgram = null;
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);
      return;
    }

    if (this.userPrograms.length === 1) {
      this.activeProgram = this.userPrograms[0];
      this.onProgramChange(this.activeProgram);
    } else {
      this.activeProgram = null;
      this.tokenService.setActiveProgram('');
      this.tokenService.setActiveProgramId(null);
    }
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

  get canContinue(): boolean {
    if (this.isLoading) {
      return false;
    }
    if (this.isStructuralAdmin) {
      return true;
    }
    if (!this.activeRole || this.userRoles.length === 0) {
      return false;
    }
    if (this.activeRoleRequiresProgram) {
      return this.userPrograms.length > 0 && !!this.activeProgram;
    }
    return true;
  }

  get activeRoleRequiresProgram(): boolean {
    const role = String(this.activeRole ?? '')
      .trim()
      .toUpperCase();

    return this.PROGRAM_REQUIRED_ROLES.includes(role);
  }
}
