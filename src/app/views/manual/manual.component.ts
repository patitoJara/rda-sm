import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

import { IntroComponent } from './sections/intro.component';
import { DemandaComponent } from './sections/demanda.component';
import { ListadoComponent } from './sections/listado.component';
import { MantenedoresComponent } from './sections/mantenedores.component';
import { RolesComponent } from './sections/roles.component';
import { SeguridadComponent } from './sections/seguridad.component';
import { TransferComponent } from './sections/transfer.component';
import { PanelEstrategicoComponent } from './sections/panel-estrategico.component';

import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-manual',
  standalone: true,
  templateUrl: './manual.component.html',
  styleUrls: ['./manual.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatExpansionModule,
    MatListModule,
    MatIconModule,
    IntroComponent,
    DemandaComponent,
    ListadoComponent,
    MantenedoresComponent,
    RolesComponent,
    SeguridadComponent,
    TransferComponent,
    PanelEstrategicoComponent,
  ],
})
export class ManualComponent {
  @ViewChild('manualScroll') manualScroll!: ElementRef<HTMLDivElement>;

  showIndexBtn = false;

  onScroll(): void {
    const scrollTop = this.manualScroll.nativeElement.scrollTop;
    this.showIndexBtn = scrollTop > 300;
  }

  scrollToIndex(): void {
    this.manualScroll.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  scrollTo(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
