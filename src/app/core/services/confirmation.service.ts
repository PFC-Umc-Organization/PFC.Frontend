import { Injectable, signal } from '@angular/core';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Destructive action: the confirm button turns red. */
  danger?: boolean;
}

interface PendingRequest extends ConfirmationRequest {
  resolve: (confirmed: boolean) => void;
}

/**
 * The app's own replacement for `confirm()`. `ConfirmDialogComponent`,
 * mounted once in `LayoutComponent`, shows `request()` and calls `answer`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly pending = signal<PendingRequest | null>(null);
  readonly request = this.pending.asReadonly();

  confirm(request: ConfirmationRequest): Promise<boolean> {
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  answer(confirmed: boolean): void {
    this.pending()?.resolve(confirmed);
    this.pending.set(null);
  }
}
