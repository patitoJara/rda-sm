import {
  Component,
  AfterViewInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserEmailDialogComponent } from './user-email.dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { forkJoin, merge, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { User } from '../../models/user';
import { UsersService } from '../../services/users.service';
import { UsersDialogComponent } from './users.dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

import { AuthLoginService } from '../../services/auth.login.service';
import { Router } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  standalone: true,
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
})
export class UsersComponent implements AfterViewInit {
  displayedColumns = [
    'rut',
    'usuario',
    'cuenta',
    'acceso',
    'estado',
    'acciones',
  ];
  dataSource = new MatTableDataSource<User>([]);
  loading = false;
  total = 0;

  /** Filtro por texto */
  q = '';

  /** Filtro de estado */
  filterUsers: 'all' | 'active' | 'deleted' = 'active';

  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(UsersService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private tokenService = inject(TokenService);
  private sessionService = inject(SessionService);
  //private authService = inject(AuthLoginService);
  //private router = inject(Router);

  ngAfterViewInit(): void {
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = 10;

    this.sort.active = 'id';
    this.sort.direction = 'asc' as SortDirection;

    this.sort.sortChange.subscribe(() => this.paginator.firstPage());
    merge(this.sort.sortChange, this.paginator.page).subscribe(() =>
      this.load(),
    );

    this.load();
    this.cdr.detectChanges();
  }

  /** Mapeo de campos para ordenar */
  private mapSortField(active?: string): string {
    switch (active) {
      case 'id':
        return 'id';
      case 'rut':
        return 'rut';
      case 'firstName':
        return 'firstName';
      case 'secondName':
        return 'secondName';
      case 'firstLastName':
        return 'firstLastName';
      case 'secondLastName':
        return 'secondLastName';
      case 'email':
        return 'email';
      case 'username':
        return 'username';
      case 'password':
        return 'password';
      case 'createdAt':
        return 'createdAt';
      case 'updatedAt':
        return 'updatedAt';
      case 'deletedAt':
        return 'deletedAt';
      default:
        return 'id';
    }
  }

  /** Carga usuarios desde el backend */
  load(): void {
    const sequence = ++this.loadSequence;
    this.loading = true;

    const page = this.paginator?.pageIndex ?? 0;
    const size = this.paginator?.pageSize ?? 10;

    const active = this.sort?.active;
    const direction = (this.sort?.direction as '' | 'asc' | 'desc') || 'asc';
    const sortField = this.mapSortField(active);

    const sort = `${sortField},${direction}`;

    this.api
      .getAllPaginated({
        page,
        size,
        q: undefined,
        state: undefined,
        sort,
      })
      .pipe(finalize(() => { if (sequence === this.loadSequence) this.loading = false; }))
      .subscribe({
        next: (res: any) => {
          if (sequence !== this.loadSequence) return;
          console.log('[USERS PAGINATION]', {
            pageIndex: this.paginator.pageIndex,
            pageSize: this.paginator.pageSize,
            response: res,
          });
          const allRows: User[] = Array.isArray(res)
            ? res
            : (res?.content ?? []);

          if (Array.isArray(res)) {

            console.table(

              allRows.map((user: any) => ({

                id: user.id,

                rut: user.rut,

                firstName: user.firstName,

                secondName: user.secondName,

                firstLastName: user.firstLastName,

                secondLastName: user.secondLastName,

                username: user.username,

                deletedAt: user.deletedAt,

              })),

            );
            let filteredRows = [...allRows];

            if (this.filterUsers === 'active') {
              filteredRows = filteredRows.filter((user) => !user.deletedAt);
            } else if (this.filterUsers === 'deleted') {
              filteredRows = filteredRows.filter((user) => !!user.deletedAt);
            }

            const normalize = (value: unknown): string =>
              String(value ?? '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[.\-\s]/g, '');

            const searchTerms = this.q.trim().split(/\s+/).map(normalize).filter(Boolean);

            if (searchTerms.length) {
              filteredRows = filteredRows.filter((user) => {
                const searchableText = normalize([
                  user.rut,
                  user.firstName,
                  user.secondName,
                  user.firstLastName,
                  user.secondLastName,
                  user.username,
                  user.email,
                ].join(' '));

                return searchTerms.every((term) => searchableText.includes(term));
              });
            }

            filteredRows.sort((a, b) => {
              const aValue = this.getFieldValue(a, sortField);
              const bValue = this.getFieldValue(b, sortField);

              const aEmpty = aValue === null || aValue === undefined || aValue === '';
              const bEmpty = bValue === null || bValue === undefined || bValue === '';

              if (aEmpty && bEmpty) return 0;
              if (aEmpty) return direction === 'asc' ? 1 : -1;
              if (bEmpty) return direction === 'asc' ? -1 : 1;

              let comparison = 0;

              if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
              } else {
                comparison = String(aValue).localeCompare(
                  String(bValue),
                  'es',
                  {
                    sensitivity: 'base',
                    numeric: true,
                  },
                );
              }

              return direction === 'desc' ? -comparison : comparison;
            });

            this.total = filteredRows.length;

            const start = page * size;
            const end = start + size;
            const pagedRows = filteredRows.slice(start, end);

            this.enrichUsers(pagedRows);
            return;
          }

          this.total = Number(res?.totalElements ?? allRows.length);
          this.enrichUsers(allRows);
        },
        error: (err) => {
          if (sequence !== this.loadSequence) return;
          console.error('Error cargando usuarios:', err);
          this.total = 0;
          this.dataSource.data = [];
        },
      });
  }
  private enrichUsers(users: User[]): void {
    if (!users.length) {
      this.dataSource.data = [];
      return;
    }

    const requests = users.map((user) => {
      const userId = Number(user.id);

      if (!Number.isFinite(userId) || userId <= 0) {
        return of({
          ...user,
          roles: [],
          programs: [],
        } as User);
      }

      return forkJoin({
        roles: this.api.getUserRoles(userId).pipe(catchError(() => of([]))),
        programs: this.api
          .getUserPrograms(userId)
          .pipe(catchError(() => of([]))),
      }).pipe(
        map(
          ({ roles, programs }) =>
            ({
              ...user,
              roles,
              programs,
            }) as User,
        ),
      );
    });

    forkJoin(requests).subscribe({
      next: (enrichedUsers: User[]) => {
        this.dataSource.data = enrichedUsers;
      },
      error: (err) => {
        console.error('Error cargando roles y programas de los usuarios:', err);

        this.dataSource.data = users;
      },
    });
  }

  getUserRolesLabel(user: User): string {
    const roles = Array.isArray(user.roles) ? user.roles : [];

    const names = roles
      .map((role: any) => role?.name ?? role?.code ?? role)
      .filter(Boolean);

    return names.length ? names.join(', ') : 'Sin rol';
  }

  /** Filtrado por texto */
  getUserProgramsLabel(user: any): string {
    const programs = Array.isArray(user?.programs) ? user.programs : [];

    if (programs.length > 0) {
      return programs
        .map((program: any) => program?.name ?? program)
        .filter(Boolean)
        .join(', ');
    }

    if (user?.program?.name) {
      return user.program.name;
    }

    if (typeof user?.program === 'string' && user.program.trim()) {
      return user.program.trim();
    }

    return 'Sin programa';
  }

  applyFilter(term: string): void {
    this.q = term;
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      this.paginator.firstPage();
      this.load();
    }, 300);
  }

  /** Obtener valor para ordenar */
  private getFieldValue(row: User, field: string): any {
    switch (field) {
      case 'id':
        return row.id;
      case 'rut':
        return row.rut;
      case 'firstName':
        return row.firstName;
      case 'secondName':
        return row.secondName;
      case 'firstLastName':
        return row.firstLastName;
      case 'secondLastName':
        return row.secondLastName;
      case 'email':
        return row.email;
      case 'username':
        return row.username;
      case 'password':
        return row.password;
      case 'createdAt':
        return row.createdAt;
      case 'updatedAt':
        return row.updatedAt;
      case 'deletedAt':
        return row.deletedAt;
      default:
        return row.id;
    }
  }

  /** Cambio de estado */
  setState(state: 'all' | 'active' | 'deleted'): void {
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
    this.q = '';
    this.filterUsers = state;
    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(user?: User): void {
    const ref = this.dialog.open(UsersDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: user ? structuredClone(user) : null, // ✅ crea copia profunda limpia
      disableClose: true,
    });

    ref.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  /** Cambia solo el estado de habilitación. No afecta relaciones. */
  toggleActive(row: User): void {
    if (row.deletedAt || row.active === undefined || row.id == null) return;
    const next = !row.active;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '430px', disableClose: true,
      data: {
        title: next ? 'Activar usuario' : 'Inactivar usuario',
        message: `¿Confirmas ${next ? 'activar' : 'inactivar'} la cuenta de ${row.firstName ?? row.username}? Se conservarán sus roles, programas y actuaciones históricas.`,
        confirmText: next ? 'Activar' : 'Inactivar',
        cancelText: 'Cancelar',
        color: next ? 'primary' : 'warn', icon: next ? 'check_circle' : 'person_off',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.loading = true;
      this.api.setActive(Number(row.id), next).subscribe({
        next: () => this.load(),
        error: (err) => { this.loading = false; console.error('Error cambiando habilitación:', err); window.alert('No se pudo cambiar el estado. Comprueba los permisos y vuelve a consultar.'); },
      });
    });
  }

  /** Correo independiente: jamás pasa por la edición general de roles/programas. */
  editEmail(row: User): void {
    if (row.deletedAt || row.id == null) return;
    const ref = this.dialog.open(UserEmailDialogComponent, {
      width: '460px', maxWidth: '95vw', disableClose: true,
      data: { email: row.email ?? '', username: row.username ?? '' },
    });
    ref.afterClosed().subscribe((email: string | undefined) => {
      if (email === undefined || email === row.email) return;
      this.loading = true;
      this.api.updateEmail(Number(row.id), email).subscribe({
        next: () => {
          const currentUserId = this.tokenService.getUserId();

          if (currentUserId !== null && Number(row.id) === currentUserId) {
            window.alert(
              'Tu correo electrónico fue actualizado correctamente. ' +
              'Por seguridad, debes iniciar sesión nuevamente.'
            );
            this.sessionService.logout('manual');
            return;
          }

          this.load();
        },
        error: (err) => { this.loading = false; console.error('Error actualizando correo:', err); window.alert('No se pudo actualizar el correo. Comprueba el dato y vuelve a consultar.'); },
      });
    });
  }

  /** Soft delete */
  softDelete(row: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Eliminar usuario',
        message: `¿Seguro que deseas eliminar a “${row.firstName}” (ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) this.api.delete(Number(row.id)).subscribe(() => this.load());
    });
  }

  /** Restaurar usuario */
  restore(row: User): void {
    this.api.restore(Number(row.id)).subscribe(() => this.load());
  }
}
