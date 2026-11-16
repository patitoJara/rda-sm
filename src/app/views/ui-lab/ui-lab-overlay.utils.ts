export interface LabRect { left: number; top: number; bottom: number; width: number; }

/** Viewport coordinates, including visual-viewport offsets when zoomed. */
export function positionLabPopover(anchor: LabRect, viewport: {width: number; height: number; left?: number; top?: number}, preferredWidth: number, height: number) {
  const margin = 8;
  const gap = 5;
  const x = viewport.left ?? 0;
  const y = viewport.top ?? 0;
  const width = Math.min(Math.max(anchor.width, preferredWidth), Math.max(0, viewport.width - margin * 2));
  const below = Math.max(0, y + viewport.height - margin - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - gap - y - margin);
  const placement = below >= height || below >= above ? 'bottom' : 'top';
  const maxHeight = Math.min(viewport.height - margin * 2, placement === 'bottom' ? below : above);
  const top = placement === 'bottom' ? anchor.bottom + gap : anchor.top - gap - Math.min(height, maxHeight);
  return {width, maxHeight: Math.max(0, maxHeight), placement,
    left: Math.max(x + margin, Math.min(anchor.left, x + viewport.width - margin - width)),
    top: Math.max(y + margin, Math.min(top, y + viewport.height - margin - Math.min(height, maxHeight)))};
}

export function balancedKpiColumns(width: number, minimum = 250, gap = 10): number {
  return [6, 3, 2, 1].find(count => count * minimum + (count - 1) * gap <= width) ?? 1;
}
