import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { positionLabPopover } from './ui-lab-overlay.utils';

/** Local top-layer prototype: no backdrop, no modal focus trap, no global styles. */
@Directive({selector: '[labPopover]', standalone: true, exportAs: 'labPopover'})
export class LabPopoverDirective implements OnDestroy {
  @Input({required: true}) labPopover!: HTMLElement;
  @Input() labPopoverAnchor?: HTMLElement;
  @Input() labPopoverWidth = 300;
  @Output() labPopoverClosed = new EventEmitter<void>();
  @HostBinding('attr.popover') readonly popover = 'auto';
  @HostBinding('style.position') readonly position = 'fixed';
  @HostBinding('style.margin') readonly margin = '0';
  @HostBinding('style.inset') readonly inset = 'auto';
  opened = false;
  private observer?: ResizeObserver;
  private frame = 0;
  private focusTimer?: ReturnType<typeof setTimeout>;
  constructor(private readonly element: ElementRef<HTMLElement>) {}
  open(selector: string | null = 'button:not(:disabled), input:not(:disabled)'): void {
    if (this.opened) { this.close(); return; }
    this.opened = true;
    this.element.nativeElement.showPopover();
    this.reposition();
    window.addEventListener('resize', this.schedule);
    document.addEventListener('scroll', this.schedule, true);
    window.visualViewport?.addEventListener('resize', this.schedule);
    window.visualViewport?.addEventListener('scroll', this.schedule);
    this.observer = new ResizeObserver(this.schedule);
    this.observer.observe(this.labPopoverAnchor ?? this.labPopover);
    this.observer.observe(this.element.nativeElement);
    this.focusTimer = setTimeout(() => {
      if (this.opened && selector) this.element.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
  close(restore = true): void {
    if (!this.opened) return;
    this.element.nativeElement.hidePopover();
    this.cleanup();
    if (restore && this.labPopover.isConnected) this.labPopover.focus();
  }
  focusFirst(selector = '[data-option]'): void {
    if (!this.opened) this.open(selector);
    else this.element.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }
  @HostListener('toggle') onToggle(): void {
    if (!this.element.nativeElement.matches(':popover-open')) this.cleanup();
  }
  @HostListener('keydown.escape', ['$event']) escape(event: KeyboardEvent): void {
    event.preventDefault(); event.stopPropagation(); this.close();
  }
  @HostListener('focusout') onFocusOut(): void {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const active = document.activeElement;
      if (this.opened && active && !this.element.nativeElement.contains(active) && !this.labPopover.contains(active)) this.close(false);
    });
  }
  private readonly schedule = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.reposition());
  };
  private reposition(): void {
    if (!this.opened) return;
    const panel = this.element.nativeElement;
    const anchor = (this.labPopoverAnchor ?? this.labPopover).getBoundingClientRect();
    const visual = window.visualViewport;
    const viewport = {width: visual?.width ?? innerWidth, height: visual?.height ?? innerHeight, left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0};
    if (anchor.bottom < viewport.top || anchor.top > viewport.top + viewport.height) { this.close(false); return; }
    // Use full scroll height, so constrained panels can grow again after scrolling/resizing.
    const result = positionLabPopover(anchor, viewport, this.labPopoverWidth, panel.scrollHeight + 2);
    Object.assign(panel.style, {left: `${result.left}px`, top: `${result.top}px`, width: `${result.width}px`, maxHeight: `${result.maxHeight}px`});
  }
  private cleanup(): void {
    const wasOpen = this.opened;
    this.opened = false;
    clearTimeout(this.focusTimer);
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    window.removeEventListener('resize', this.schedule);
    document.removeEventListener('scroll', this.schedule, true);
    window.visualViewport?.removeEventListener('resize', this.schedule);
    window.visualViewport?.removeEventListener('scroll', this.schedule);
    if (wasOpen) this.labPopoverClosed.emit();
  }
  ngOnDestroy(): void { this.cleanup(); }
}
