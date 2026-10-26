import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Marks which sides of a sideways-scrolling box still hide content, so the
 * styles fade that edge: a table cut at the screen's edge looks finished
 * otherwise.
 */
@Directive({
  selector: '.table-scroll, [appScrollHint]',
})
export class ScrollHintDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.toggleAttribute('data-more-left', el.scrollLeft > 1);
      el.toggleAttribute('data-more-right', el.scrollLeft < max - 1);
    };
    afterNextRender(() => {
      update();
      el.addEventListener('scroll', update, { passive: true });
      const resize = new ResizeObserver(update);
      resize.observe(el);
      for (const child of Array.from(el.children)) {
        resize.observe(child);
      }
      this.cleanup = () => {
        el.removeEventListener('scroll', update);
        resize.disconnect();
      };
    });
    inject(DestroyRef).onDestroy(() => this.cleanup());
  }

  private cleanup = () => {};
}
