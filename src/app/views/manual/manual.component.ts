import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

import { IntroComponent } from './sections/intro.component';
import { ListadoComponent } from './sections/listado.component';
import { MantenedoresComponent } from './sections/mantenedores.component';
import { RolesComponent } from './sections/roles.component';
import { SeguridadComponent } from './sections/seguridad.component';
import { ReferenciaComponent } from './sections/referencia.component';
import { PanelEstrategicoComponent } from './sections/panel-estrategico.component';
import { PersonaComponent } from './sections/persona.component';
import { EpisodioComponent } from './sections/episodio.component';
import { EtapaComponent } from './sections/etapa.component';
import { EventosComponent } from './sections/eventos.component';
import { SustanciasComponent } from './sections/sustancias.component';

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
    ListadoComponent,
    MantenedoresComponent,
    RolesComponent,
    SeguridadComponent,
    ReferenciaComponent,
    PanelEstrategicoComponent,
    PersonaComponent,
    EpisodioComponent,
    EtapaComponent,
    EventosComponent,
    SustanciasComponent,
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
