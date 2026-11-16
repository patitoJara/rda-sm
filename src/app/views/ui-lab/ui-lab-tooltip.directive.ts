import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';
import { positionLabPopover } from './ui-lab-overlay.utils';

/** Styled, non-interactive top-layer tooltip; no native title or clipped table tooltip. */
@Directive({selector: '[labTooltip]', standalone: true})
export class LabTooltipDirective implements OnDestroy {
  @Input() labTooltip = '';
  private tip?: HTMLElement;
  private hover = false;
  private focus = false;
  private dismissed = false;
  constructor(private readonly element: ElementRef<HTMLElement>) {}
  @HostListener('pointerenter') enter(): void { this.hover = true; this.dismissed = false; this.show(); }
  @HostListener('focusin') focused(): void { this.focus = true; this.dismissed = false; this.show(); }
  @HostListener('pointerleave') leave(): void { this.hover = false; if (!this.focus) this.hide(); }
  @HostListener('focusout') blurred(): void { this.focus = false; if (!this.hover) this.hide(); }
  @HostListener('keydown.escape') escape(): void { this.dismissed = true; this.hide(); }
  @HostListener('click') click(): void { this.dismissed = true; this.hide(); }
  private show(): void {
    if (this.tip || this.dismissed || !this.labTooltip) return;
    const tip = document.createElement('span');
    tip.setAttribute('popover', 'manual');
    tip.setAttribute('aria-hidden', 'true'); // Buttons retain their explicit accessible name.
    tip.textContent = this.labTooltip;
    Object.assign(tip.style, {position: 'fixed', inset: 'auto', margin: '0', padding: '5px 8px', border: '1px solid var(--ui-border)', borderRadius: '6px', background: 'var(--ui-text)', color: 'var(--ui-surface)', font: '400 12px Roboto, Arial, sans-serif', pointerEvents: 'none', maxWidth: 'calc(100vw - 16px)', boxSizing: 'border-box'});
    this.element.nativeElement.appendChild(tip);
    this.tip = tip;
    tip.showPopover();
    const position = positionLabPopover(this.element.nativeElement.getBoundingClientRect(), {width: innerWidth, height: innerHeight}, Math.min(tip.scrollWidth + 18, 280), tip.offsetHeight);
    Object.assign(tip.style, {left: `${position.left}px`, top: `${position.top}px`});
    document.addEventListener('scroll', this.dismissOnMove, true);
    window.addEventListener('resize', this.dismissOnMove);
  }
  private readonly dismissOnMove = (): void => this.hide();
  private hide(): void {
    this.tip?.remove(); this.tip = undefined;
    document.removeEventListener('scroll', this.dismissOnMove, true);
    window.removeEventListener('resize', this.dismissOnMove);
  }
  ngOnDestroy(): void { this.hide(); }
}
