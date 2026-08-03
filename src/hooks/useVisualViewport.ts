import { useEffect } from 'react';

const viewportHeightProperty = '--app-viewport-height';

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let animationFrame = 0;

    const getViewportHeight = () => {
      const layoutHeight = window.innerHeight
        || document.documentElement.clientHeight;
      const activeElement = document.activeElement;
      const isEditing = activeElement instanceof HTMLInputElement
        || activeElement instanceof HTMLTextAreaElement
        || (
          activeElement instanceof HTMLElement
          && activeElement.isContentEditable
        );

      if (!isEditing || !viewport?.height) {
        return layoutHeight;
      }

      return Math.min(layoutHeight, viewport.height);
    };

    const updateViewportHeight = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const height = getViewportHeight();
        document.documentElement.style.setProperty(
          viewportHeightProperty,
          `${Math.round(height)}px`,
        );
      });
    };

    updateViewportHeight();
    viewport?.addEventListener('resize', updateViewportHeight);
    viewport?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    document.addEventListener('focusin', updateViewportHeight);
    document.addEventListener('focusout', updateViewportHeight);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport?.removeEventListener('resize', updateViewportHeight);
      viewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      document.removeEventListener('focusin', updateViewportHeight);
      document.removeEventListener('focusout', updateViewportHeight);
      document.documentElement.style.removeProperty(viewportHeightProperty);
    };
  }, []);
}
