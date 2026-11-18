import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

const FLASH_MS = 1500;

// Diretiva
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class RevealDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private frame = 0;

  readonly appReveal = input<unknown>();

  // Inicialização
  constructor() {
    effect(() => {
      const key = this.appReveal();
      if (key !== null && key !== undefined && key !== 0 && key !== false) {
        this.reveal();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      clearTimeout(this.timer);
    });
  }

  // Destaque
  private reveal(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      this.el.classList.add('reveal--flash');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.el.classList.remove('reveal--flash'), FLASH_MS);
    });
  }
}
