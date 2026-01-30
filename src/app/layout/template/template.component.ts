//ESTO ES UNA PRUEBA DE VERSION
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

  userRoles: string[] = [];
  userPrograms: string[] = [];
  userFullName: string = 'Usuario';
  activeRole: string | null = null;
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
    // 🟦 ROLES → prioridad: profile → tokenService → []
    // =============================================
    const rolesFromToken = this.tokenService.getUserRoles();

    /*
    if (profile.roles && profile.roles.length > 0) {
      this.userRoles = profile.roles;
    } else if (rolesFromToken.length > 0) {
      this.userRoles = rolesFromToken;
    } else {
      this.userRoles = [];
    }*/

    this.userRoles =
      rolesFromToken.length > 0 ? rolesFromToken : (profile.roles ?? []);

    // =============================================
    // 🟦 PROGRAMAS → prioridad: profile → tokenService → []
    // =============================================

    const rawPrograms =
      profile.programs && profile.programs.length > 0
        ? profile.programs // del backend → objetos
        : this.tokenService.getUserPrograms(); // del token → strings

    // 🔥 Normalizamos todo a strings
    this.userPrograms = rawPrograms.map((p: any) => p.name ?? p);

    /*const programsFromToken = this.tokenService.getUserPrograms();

     if (profile.programs && profile.programs.length > 0) {
      this.userPrograms = profile.programs;
    } else if (programsFromToken.length > 0) {
      this.userPrograms = programsFromToken;
    } else {
      this.userPrograms = [];
    }*/

    // =============================================
    // 🟦 ACTIVO
    // =============================================
    this.activeRole =
      this.tokenService.getActiveRole() || this.userRoles[0] || null;

    this.activeProgram =
      this.tokenService.getActiveProgram() || this.userPrograms[0] || null;

    this.isSessionReady = true;

    // Tiempo sesión
    //this.startTimer(60);
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
    if (this.dialog.openDialogs.length > 0) {
      this.dialog.closeAll();
    }
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    this.snackBar.open('🔄 Renovando sesión...', '', {
      duration: 2500,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });

    const newToken = await this.auth.refresh();

    if (newToken) {
      this.snackBar.open('✅ Sesión extendida correctamente', '', {
        duration: 2500,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snackbar'],
      });

      // 🔥 Recalcular expiración REAL
      this.startRealExpirationTimer();
      this.showExtendButton = false;
    } else {
      this.snackBar.open('❌ No se pudo extender la sesión', '', {
        duration: 2500,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar'],
      });
    }

    this.isRefreshing = false;
    this.cdr.detectChanges();
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
    if (this.isLoading) return;
    this.isLoading = true;

    if (this.userFullName.toLowerCase() !== 'admin') {
      if (!this.activeRole || !this.activeProgram) {
        alert('⚠️ Debes seleccionar un rol y un programa para continuar.');
        this.isLoading = false;
        return;
      }
    }

    sessionStorage.setItem('activeRole', this.activeRole || '');
    sessionStorage.setItem('activeProgram', this.activeProgram || '');

    this.buildMenu();

    setTimeout(() => {
      this.menuVisible = true;
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 250);
  }

  buildMenu(): void {
    const role = (this.activeRole || '').toUpperCase();

    // 🔹 Menú principal base
    const baseMenu: any[] = [
      { title: 'Inicio', icon: 'home', route: '/inicio' },
    ];

    // 🔹 Mantenedores
    const mantenedores: any[] = [];

    // 🔹 Obtener rutas hijas del layout principal
    const mainRoute = routes.find((r) => r.children);
    const childRoutes = mainRoute?.children ?? [];

    for (const route of childRoutes) {
      // ❌ Excluir rutas inválidas, base y ocultas
      if (
        !route.path ||
        ['', '**', 'inicio'].includes(route.path) ||
        this.HIDDEN_MENU_PATHS.includes(route.path)
      ) {
        continue;
      }

      // 🔐 Validar roles
      const allowedRoles = route.data?.['roles'] ?? [];
      const visible = allowedRoles.length === 0 || allowedRoles.includes(role);

      if (!visible) continue;

      // 📌 Item de menú
      const item = {
        title: this.getTitleFromPath(route.path),
        icon: this.getIcon(route.path),
        route: '/' + route.path,
        path: route.path,
      };

      // 🛠️ Clasificar como mantenedor o menú principal
      if (this.MANTENEDOR_PATHS.includes(route.path)) {
        mantenedores.push(item);
      } else {
        baseMenu.push(item);
      }
    }

    // 🔚 Asignar a la vista
    this.menuItems = baseMenu;
    this.mantenedorItems = mantenedores;
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
    };
    return icons[path] || 'chevron_right';
  }

  private getTitleFromPath(path: string): string {
    const titles: Record<string, string> = {
      inicio: 'Inicio',
      manual: 'Manual',
      demand: 'Demandas',
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
}
