import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * Details one click away: a sheet that slides up over the panel, so lists stay one line per
 * item. Escape, the × button or a click on the dimmed page closes it; focus returns to the row.
 */
export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // The latest onClose, so the setup below runs once per opening, not on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="sheet-layer" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet-head">
          <div className="sheet-heading">
            <h3 id={titleId}>{title}</h3>
            {subtitle && <p className="meta">{subtitle}</p>}
          </div>
          <button type="button" className="btn icon quiet" aria-label="Close" onClick={onClose}>
            <Icon name="cross" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
