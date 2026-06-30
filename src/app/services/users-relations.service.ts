import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersRelationsService {
  private http = inject(HttpClient);
  private BASE = environment.BaseUrl.replace(/\/+$/, '');

  private readonly usersRolesUrl = `${this.BASE}/api/v1/users_roles`;
  private readonly usersProgramsUrl = `${this.BASE}/api/v1/users_programs`;

  // ============================================================
  // ROLES
  // Sincronización idempotente:
  // - Activo + seleccionado     => no hace nada
  // - Eliminado + seleccionado  => restore
  // - No existe + seleccionado  => create
  // - Activo + no seleccionado  => delete lógico
  // ============================================================
  async updateRoles(
    userId: number,
    newRoles: Array<{ id: number }>,
  ): Promise<void> {
    const newIds = this.uniqueIds(newRoles.map((role) => role.id));
    const current = await this.getUserRoleRelations(userId);

    const activeRelations = current.filter((item) => !this.isDeleted(item));
    const deletedRelations = current.filter((item) => this.isDeleted(item));

    const activeIds = this.uniqueIds(
      activeRelations.map((item) => this.getRoleIdFromRelation(item)),
    );

    const deletedIds = this.uniqueIds(
      deletedRelations.map((item) => this.getRoleIdFromRelation(item)),
    );

    const toRestore = newIds.filter((id) => deletedIds.includes(id));
    const toCreate = newIds.filter(
      (id) => !activeIds.includes(id) && !deletedIds.includes(id),
    );
    const toDelete = activeIds.filter((id) => !newIds.includes(id));

    for (const roleId of toRestore) {
      await firstValueFrom(this.restoreUserRole(userId, roleId));
    }

    for (const roleId of toCreate) {
      await firstValueFrom(this.addUserRole(userId, roleId));
    }

    for (const roleId of toDelete) {
      await firstValueFrom(this.deleteUserRole(userId, roleId));
    }

    console.log('[UsersRelationsService] ✅ Roles sincronizados', {
      userId,
      selected: newIds,
      restored: toRestore,
      created: toCreate,
      deleted: toDelete,
    });
  }

  // ============================================================
  // PROGRAMAS
  // Misma regla que roles: restaurar eliminado, crear nuevo,
  // eliminar lógico lo no seleccionado.
  // ============================================================
  async updatePrograms(
    userId: number,
    newPrograms: Array<{ id: number }>,
  ): Promise<void> {
    const newIds = this.uniqueIds(newPrograms.map((program) => program.id));
    const current = await this.getUserProgramRelations(userId);

    const activeRelations = current.filter((item) => !this.isDeleted(item));
    const deletedRelations = current.filter((item) => this.isDeleted(item));

    const activeIds = this.uniqueIds(
      activeRelations.map((item) => this.getProgramIdFromRelation(item)),
    );

    const deletedIds = this.uniqueIds(
      deletedRelations.map((item) => this.getProgramIdFromRelation(item)),
    );

    const toRestore = newIds.filter((id) => deletedIds.includes(id));
    const toCreate = newIds.filter(
      (id) => !activeIds.includes(id) && !deletedIds.includes(id),
    );
    const toDelete = activeIds.filter((id) => !newIds.includes(id));

    for (const programId of toRestore) {
      await firstValueFrom(this.restoreUserProgram(userId, programId));
    }

    for (const programId of toCreate) {
      await firstValueFrom(this.addUserProgram(userId, programId));
    }

    for (const programId of toDelete) {
      await firstValueFrom(this.deleteUserProgram(userId, programId));
    }

    console.log('[UsersRelationsService] ✅ Programas sincronizados', {
      userId,
      selected: newIds,
      restored: toRestore,
      created: toCreate,
      deleted: toDelete,
    });
  }

  // ============================================================
  // LISTADOS DE RELACIONES
  // IMPORTANTE: para poder restaurar relaciones eliminadas, el backend
  // debe devolver también las eliminadas. Se prueban endpoints comunes.
  // Si ninguno existe, cae al endpoint activo actual.
  // ============================================================
  private async getUserRoleRelations(userId: number): Promise<any[]> {
    return this.tryGetMany([
      `${this.usersRolesUrl}/user/${userId}/all`,
      `${this.usersRolesUrl}/user/${userId}?includeDeleted=true`,
      `${this.usersRolesUrl}/user/${userId}?state=all`,
      `${this.usersRolesUrl}/user/${userId}`,
    ]);
  }

  private async getUserProgramRelations(userId: number): Promise<any[]> {
    return this.tryGetMany([
      `${this.usersProgramsUrl}/user/${userId}/all`,
      `${this.usersProgramsUrl}/user/${userId}?includeDeleted=true`,
      `${this.usersProgramsUrl}/user/${userId}?state=all`,
      `${this.usersProgramsUrl}/user/${userId}`,
    ]);
  }

  private async tryGetMany(urls: string[]): Promise<any[]> {
    for (const url of urls) {
      try {
        const res = await firstValueFrom(this.http.get<any>(url));

        if (!res) {
          return [];
        }

        if (Array.isArray(res)) {
          return res;
        }

        if (Array.isArray(res.content)) {
          return res.content;
        }

        return [res];
      } catch (error: any) {
        const status = error?.status;

        if (status === 404 || status === 403 || status === 405) {
          continue;
        }

        throw error;
      }
    }

    return [];
  }

  // ============================================================
  // ROLES: create / delete / restore
  // ============================================================
  addUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.post(this.usersRolesUrl, {
      user: { id: userId },
      role: { id: roleId },
      isActive: true,
      active: true,
    });
  }

  deleteUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.delete(
      `${this.usersRolesUrl}/user/${userId}/role/${roleId}`,
    );
  }

  restoreUserRole(userId: number, roleId: number): Observable<any> {
    return this.http
      .post(`${this.usersRolesUrl}/user/${userId}/role/${roleId}/restore`, {})
      .pipe(
        catchError((firstError) => {
          // Fallback por si backend implementa restore como recurso general.
          return this.http
            .post(`${this.usersRolesUrl}/restore`, {
              user: { id: userId },
              role: { id: roleId },
            })
            .pipe(catchError(() => throwError(() => firstError)));
        }),
      );
  }

  // ============================================================
  // PROGRAMAS: create / delete / restore
  // ============================================================
  addUserProgram(userId: number, programId: number): Observable<any> {
    return this.http.post(this.usersProgramsUrl, {
      user: { id: userId },
      program: { id: programId },
      isActive: true,
      active: true,
      isSupervisor: false,
      canManageDemands: true,
      canReceiveReferences: true,
      canViewDashboard: true,
    });
  }

  deleteUserProgram(userId: number, programId: number): Observable<any> {
    return this.http.delete(
      `${this.usersProgramsUrl}/user/${userId}/program/${programId}`,
    );
  }

  restoreUserProgram(userId: number, programId: number): Observable<any> {
    return this.http
      .post(
        `${this.usersProgramsUrl}/user/${userId}/program/${programId}/restore`,
        {},
      )
      .pipe(
        catchError((firstError) => {
          // Fallback por si backend implementa restore como recurso general.
          return this.http
            .post(`${this.usersProgramsUrl}/restore`, {
              user: { id: userId },
              program: { id: programId },
            })
            .pipe(catchError(() => throwError(() => firstError)));
        }),
      );
  }

  // ============================================================
  // Helpers tolerantes a distintas formas de DTO
  // ============================================================
  private uniqueIds(values: Array<number | undefined | null>): number[] {
    return Array.from(
      new Set(
        values
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );
  }

  private isDeleted(item: any): boolean {
    return !!(
      item?.deletedAt ||
      item?.deleted_at ||
      item?.deletedDate ||
      item?.deleted_date
    );
  }

  private getRoleIdFromRelation(item: any): number | null {
    return (
      Number(
        item?.role?.id ??
          item?.roleId ??
          item?.role_id ??
          item?.idRole ??
          item?.id_role ??
          item?.id,
      ) || null
    );
  }

  private getProgramIdFromRelation(item: any): number | null {
    return (
      Number(
        item?.program?.id ??
          item?.programId ??
          item?.program_id ??
          item?.idProgram ??
          item?.id_program ??
          item?.id,
      ) || null
    );
  }
}
