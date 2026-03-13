import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule  } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TokenService } from '../../services/token.service';
import { DashboardComponent } from '../../views/dashboard/dashboard.component';


@Component({
  standalone: true,
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule, DashboardComponent],
})
export class InicioComponent implements OnInit {

  private tokenService = inject(TokenService);

  programs: string[] = [];
  activeProgram: string | null = null;

  roles: string[] = [];               // 🆕 todos los roles
  activeRole: string | null = null;   // 🆕 rol activo

  fullName: string = '';
  currentDate: Date = new Date();

  ngOnInit(): void {
    this.loadData();

    // ⏰ Actualiza la hora cada minuto
    setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

  private loadData(): void {

    // ----------------------------------------------------
    // 🟦 Perfil
    // ----------------------------------------------------
    const profile = this.tokenService.getUserProfile();
    this.fullName = profile?.fullName || 'Usuario';

    // ----------------------------------------------------
    // 🟦 Roles disponibles
    // ----------------------------------------------------
    const allRoles = this.tokenService.getUserRoles() || [];
    this.roles = allRoles;

    // ----------------------------------------------------
    // 🟦 Rol activo
    // ----------------------------------------------------
    this.activeRole =
      sessionStorage.getItem('activeRole') ||
      this.roles[0] ||
      null;

    if (this.activeRole) {
      sessionStorage.setItem('activeRole', this.activeRole);
    }

    // ----------------------------------------------------
    // 🟦 Programas disponibles
    // ----------------------------------------------------
    const rawPrograms = this.tokenService.getUserPrograms() || [];
    this.programs = rawPrograms.map((p: any) => p.name ?? p);

    // ----------------------------------------------------
    // 🟦 Programa activo
    // ----------------------------------------------------
    this.activeProgram =
      this.tokenService.getActiveProgram() ||
      this.programs[0] ||
      null;

    if (this.activeProgram) {
      sessionStorage.setItem('activeProgram', this.activeProgram);
    }
  }
}
