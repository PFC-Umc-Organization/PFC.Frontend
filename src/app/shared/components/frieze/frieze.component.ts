import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The greek key band that closes the hero; a `<pattern>` so it repeats at any width. */
@Component({
  selector: 'app-frieze',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './frieze.component.html',
  styleUrl: './frieze.component.scss',
})
export class FriezeComponent {}
