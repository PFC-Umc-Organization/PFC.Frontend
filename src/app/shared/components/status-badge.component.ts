import { Component, Input, computed, signal } from '@angular/core';

import {
  ROTULO_STATUS_ENTREGA_CURTO,
  StatusEntrega,
  TOM_STATUS_ENTREGA,
} from '../../core/models';

/** Selo de status de entrega usado nas tabelas do professor. */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge--' + tom()">{{
    rotulo()
  }}</span>`,
})
export class StatusBadgeComponent {
  private readonly _status = signal<StatusEntrega>('PENDENTE');

  @Input({ required: true })
  set status(valor: StatusEntrega) {
    this._status.set(valor);
  }

  readonly tom = computed(() => TOM_STATUS_ENTREGA[this._status()]);
  readonly rotulo = computed(
    () => ROTULO_STATUS_ENTREGA_CURTO[this._status()],
  );
}
