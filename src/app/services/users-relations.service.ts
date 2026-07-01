import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
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
      const relation = deletedRelations.find(
        (item) => Number(this.getRoleIdFromRelation(item)) === Number(roleId),
      );

      if (relation?.id) {
        await this.restoreUserRoleByRelationId(Number(relation.id));
      }
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
      const relation = deletedRelations.find(
        (item) =>
          Number(this.getProgramIdFromRelation(item)) === Number(programId),
      );

      if (relation?.id) {
        await this.restoreUserProgramByRelationId(Number(relation.id));
      }
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
    const active = await this.tryGetMany([
      `${this.usersRolesUrl}/user/${userId}`,
      `${this.usersRolesUrl}`,
    ]);

    const deleted = await this.tryGetMany([
      `${this.usersRolesUrl}/deleted`,
      `${this.usersRolesUrl}/all`,
    ]);

    return [...active, ...deleted].filter((relation: any) => {
      return Number(relation?.user?.id) === Number(userId);
    });
  }

  private async getUserProgramRelations(userId: number): Promise<any[]> {
    const active = await this.tryGetMany([
      `${this.usersProgramsUrl}/user/${userId}`,
      `${this.usersProgramsUrl}`,
    ]);

    const deleted = await this.tryGetMany([
      `${this.usersProgramsUrl}/deleted`,
      `${this.usersProgramsUrl}/all`,
    ]);

    return [...active, ...deleted].filter((relation: any) => {
      return Number(relation?.user?.id) === Number(userId);
    });
  }

  private async tryGetMany(urls: string[]): Promise<any[]> {
    for (const url of urls) {
      try {
        const res = await firstValueFrom(this.http.get<any>(url));

        if (Array.isArray(res)) {
          return res;
        }

        if (res) {
          return [res];
        }

        return [];
      } catch (error: any) {
        console.warn(
          '[UsersRelationsService] Endpoint no disponible:',
          url,
          error?.status,
        );

        continue;
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
      active: true,
      assignedByUser: { id: 1 },
    });
  }

  deleteUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.delete(
      `${this.usersRolesUrl}/user/${userId}/role/${roleId}`,
    );
  }

  private async restoreUserRoleByRelationId(relationId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.usersRolesUrl}/${relationId}/restore`, {}),
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
      isSupervisor: false,
      canReceiveReferences: true,
      canManageDemands: true,
      canViewDashboard: true,
      roleInProgram: 'PROFESIONAL',
    });
  }

  deleteUserProgram(userId: number, programId: number): Observable<any> {
    return this.http.delete(
      `${this.usersProgramsUrl}/user/${userId}/program/${programId}`,
    );
  }

  private async restoreUserProgramByRelationId(
    relationId: number,
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.usersProgramsUrl}/${relationId}/restore`, {}),
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
          item?.id_role,
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
          item?.id_program,
      ) || null
    );
  }
}
