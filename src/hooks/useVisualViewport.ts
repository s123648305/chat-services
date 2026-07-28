import { useEffect } from 'react';

const viewportHeightProperty = '--app-viewport-height';

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let animationFrame = 0;

    const updateViewportHeight = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight;
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

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport?.removeEventListener('resize', updateViewportHeight);
      viewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      document.documentElement.style.removeProperty(viewportHeightProperty);
    };
  }, []);
}
