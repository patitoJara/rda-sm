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
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { forkJoin, merge, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { User } from '../../models/user';
import { UsersService } from '../../services/users.service';
import { UsersDialogComponent } from './users.dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

import { AuthLoginService } from '../../services/auth.login.service';
import { Router } from '@angular/router';

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
  ],
})
export class UsersComponent implements AfterViewInit {
  displayedColumns = [
    'id',
    'rut',
    'firstName',
    'secondName',
    'firstLastName',
    'secondLastName',
    'email',
    'username',
    'roles',
    'program',
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(UsersService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
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
    this.loading = true;

    const page = this.paginator?.pageIndex ?? 0;
    const size = this.paginator?.pageSize ?? 10;

    const active = this.sort?.active;
    const direction = (this.sort?.direction as '' | 'asc' | 'desc') || 'asc';
    const sortField = this.mapSortField(active);
    this.api
      .getAllPaginated({ page, size })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const allRows: User[] = Array.isArray(res)
            ? res
            : (res?.content ?? []);
          // Filtro por estado
          let filtered = allRows;
          if (this.filterUsers === 'active') {
            filtered = allRows.filter((r) => !r.deletedAt);
          } else if (this.filterUsers === 'deleted') {
            filtered = allRows.filter((r) => !!r.deletedAt);
          }
          // Filtro por nombre
          const term = (this.q || '').toLowerCase();
          if (term) {
            filtered = filtered.filter((r) =>
              (r.firstName ?? '').toLowerCase().includes(term),
            );
          }

          // Orden
          filtered.sort((a, b) => {
            const va = this.getFieldValue(a, sortField);
            const vb = this.getFieldValue(b, sortField);
            let cmp = 0;
            if (va == null && vb != null) cmp = -1;
            else if (va != null && vb == null) cmp = 1;
            else if (typeof va === 'number' && typeof vb === 'number')
              cmp = va - vb;
            else
              cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'es', {
                numeric: true,
                sensitivity: 'base',
              });
            return direction === 'asc' ? cmp : -cmp;
          });
          // Paginación cliente
          const start = page * size;
          const slice = filtered.slice(start, start + size);

          this.total = filtered.length;
          this.enrichUsers(slice);
        },
        error: (err) => console.error('Error cargando estado:', err),
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
    this.q = term.trim();
    this.paginator.firstPage();
    this.load();
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
