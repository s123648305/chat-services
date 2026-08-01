import { pxToResponsiveVw } from './scripts/postcss-px-to-responsive-vw.mjs';

export default {
  plugins: [
    pxToResponsiveVw({
      designWidth: 375,
      minViewportWidth: 320,
      maxViewportWidth: 430,
      minPixelValue: 2,
    }),
  ],
};
