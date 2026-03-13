import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role } from '../models/role';
import { Program } from '../models/program';

@Injectable({ providedIn: 'root' })
export class UsersRelationsService {

  private http = inject(HttpClient);
  private BASE = environment.BaseUrl.replace(/\/+$/, '');

  // =========================
  // ROLES
  // =========================
  async updateRoles(userId: number, newRoles: Role[]): Promise<void> {

    const current: Role[] = await firstValueFrom(
      this.http.get<Role[]>(`${this.BASE}/api/v1/users_roles/user/${userId}`)
    );

    const currentIds = current.map(r => r.id);
    const newIds = newRoles.map(r => r.id);

    // 🔴 eliminar
    const toDelete = currentIds.filter(id => !newIds.includes(id));

    for (const roleId of toDelete) {
      await firstValueFrom(
        this.http.delete(
          `${this.BASE}/api/v1/users_roles/user/${userId}/role/${roleId}`
        )
      );
    }

    // 🟢 agregar
    const toAdd = newIds.filter(id => !currentIds.includes(id));

    for (const roleId of toAdd) {
      await firstValueFrom(
        this.http.post(`${this.BASE}/api/v1/users_roles`, {
          user: { id: userId },
          role: { id: roleId }
        })
      );
    }

    console.log('✅ Roles sincronizados');
  }

  // =========================
  // PROGRAMS
  // =========================
  async updatePrograms(userId: number, newPrograms: Program[]): Promise<void> {

    const current: Program[] = await firstValueFrom(
      this.http.get<Program[]>(
        `${this.BASE}/api/v1/users_programs/user/${userId}`
      )
    );

    const currentIds = current.map(p => p.id);
    const newIds = newPrograms.map(p => p.id);

    const toDelete = currentIds.filter(id => !newIds.includes(id));

    for (const programId of toDelete) {
      await firstValueFrom(
        this.http.delete(
          `${this.BASE}/api/v1/users_programs/user/${userId}/program/${programId}`
        )
      );
    }

    const toAdd = newIds.filter(id => !currentIds.includes(id));

    for (const programId of toAdd) {
      await firstValueFrom(
        this.http.post(`${this.BASE}/api/v1/users_programs`, {
          user: { id: userId },
          program: { id: programId }
        })
      );
    }

    console.log('✅ Programas sincronizados');
  }
}