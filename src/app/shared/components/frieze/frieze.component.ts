import { ChangeDetectionStrategy, Component } from '@angular/core';

// Componente
@Component({
  selector: 'app-frieze',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './frieze.component.html',
  styleUrl: './frieze.component.scss',
})
export class FriezeComponent {}
