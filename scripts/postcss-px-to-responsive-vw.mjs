const defaultOptions = {
  designWidth: 375,
  maxViewportWidth: 430,
  minPixelValue: 2,
  minViewportWidth: 320,
};

const fixedLengthProperties = new Set([
  'border',
  'border-block',
  'border-block-end',
  'border-block-start',
  'border-bottom',
  'border-inline',
  'border-inline-end',
  'border-inline-start',
  'border-left',
  'border-right',
  'border-top',
  'border-width',
  'box-shadow',
  'outline',
  'outline-offset',
  'text-shadow',
]);

function formatNumber(value) {
  return Number(value.toFixed(4)).toString();
}

function createResponsiveLength(value, options) {
  const {
    designWidth,
    maxViewportWidth,
    minViewportWidth,
  } = options;
  const minScale = minViewportWidth / designWidth;
  const maxScale = maxViewportWidth / designWidth;
  const lowerBound = value >= 0
    ? value * minScale
    : value * maxScale;
  const upperBound = value >= 0
    ? value * maxScale
    : value * minScale;
  const viewportValue = value / designWidth * 100;

  return `clamp(${formatNumber(lowerBound)}px, ${formatNumber(viewportValue)}vw, ${formatNumber(upperBound)}px)`;
}

function shouldIgnoreDeclaration(declaration) {
  if (declaration.prop.startsWith('--')) return true;
  if (fixedLengthProperties.has(declaration.prop)) return true;

  const previousNode = declaration.prev();
  return previousNode?.type === 'comment'
    && previousNode.text.trim() === 'px-to-vw-ignore';
}

export function pxToResponsiveVw(userOptions = {}) {
  const options = {
    ...defaultOptions,
    ...userOptions,
  };
  const processedDeclarations = new WeakSet();
  const pixelPattern = /(-?\d*\.?\d+)px\b/g;

  return {
    postcssPlugin: 'postcss-px-to-responsive-vw',
    Declaration(declaration) {
      if (processedDeclarations.has(declaration)) return;
      processedDeclarations.add(declaration);

      const sourceFile = declaration.source?.input.file ?? '';
      if (sourceFile.includes('node_modules')) return;
      if (shouldIgnoreDeclaration(declaration)) return;

      declaration.value = declaration.value.replace(
        pixelPattern,
        (source, numericValue) => {
          const value = Number(numericValue);
          if (!Number.isFinite(value) || Math.abs(value) < options.minPixelValue) {
            return source;
          }
          return createResponsiveLength(value, options);
        },
      );
    },
  };
}

pxToResponsiveVw.postcss = true;
