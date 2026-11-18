import { Injectable, signal } from '@angular/core';

// Tipo
export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

// Tipo
interface PendingRequest extends ConfirmationRequest {
  resolve: (confirmed: boolean) => void;
}

// Serviço
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly pending = signal<PendingRequest | null>(null);
  readonly request = this.pending.asReadonly();

  // Confirmação
  confirm(request: ConfirmationRequest): Promise<boolean> {
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  // Resposta
  answer(confirmed: boolean): void {
    this.pending()?.resolve(confirmed);
    this.pending.set(null);
  }
}
