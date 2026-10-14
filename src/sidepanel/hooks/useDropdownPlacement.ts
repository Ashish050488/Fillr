import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

const SCREEN_EDGE_GAP_PIXELS = 8;
const TRIGGER_GAP_PIXELS = 6;
const PREFERRED_LIST_HEIGHT_PIXELS = 280;
const MAXIMUM_LIST_WIDTH_PIXELS = 340;
const MINIMUM_LIST_WIDTH_PIXELS = 240;

/**
 * Places the open list in a fixed layer measured against the window, so opening it never
 * changes the page height or adds a scrollbar. It opens on the side with more room, never
 * overflows the screen, and follows the trigger while the panel scrolls or resizes.
 */
export function useDropdownPlacement(triggerRef: RefObject<HTMLElement | null>, isOpen: boolean): CSSProperties {
  const [placementStyle, setPlacementStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePlacement = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const screenWidth = document.documentElement.clientWidth;
      const screenHeight = window.innerHeight;
      const spaceBelow = screenHeight - bounds.bottom - TRIGGER_GAP_PIXELS - SCREEN_EDGE_GAP_PIXELS;
      const spaceAbove = bounds.top - TRIGGER_GAP_PIXELS - SCREEN_EDGE_GAP_PIXELS;
      const opensUpward = spaceBelow < PREFERRED_LIST_HEIGHT_PIXELS && spaceAbove > spaceBelow;
      const availableWidth = screenWidth - SCREEN_EDGE_GAP_PIXELS * 2;
      const width = Math.min(
        Math.max(bounds.width, MINIMUM_LIST_WIDTH_PIXELS),
        MAXIMUM_LIST_WIDTH_PIXELS,
        availableWidth,
      );
      const left = Math.min(
        Math.max(bounds.left, SCREEN_EDGE_GAP_PIXELS),
        Math.max(SCREEN_EDGE_GAP_PIXELS, screenWidth - width - SCREEN_EDGE_GAP_PIXELS),
      );
      setPlacementStyle({
        position: 'fixed',
        left,
        width,
        maxHeight: Math.min(PREFERRED_LIST_HEIGHT_PIXELS, opensUpward ? spaceAbove : spaceBelow),
        ...(opensUpward
          ? { bottom: screenHeight - bounds.top + TRIGGER_GAP_PIXELS, transformOrigin: 'bottom' }
          : { top: bounds.bottom + TRIGGER_GAP_PIXELS, transformOrigin: 'top' }),
      });
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
      setPlacementStyle({ visibility: 'hidden' });
    };
  }, [isOpen, triggerRef]);

  return placementStyle;
}
