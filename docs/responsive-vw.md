# 移动端响应式尺寸

项目通过 `postcss.config.mjs` 自动将自有 CSS 中的 `px` 转换为受控的响应式尺寸：

```css
font-size: 16px;
```

构建后会转换为：

```css
font-size: clamp(13.6533px, 4.2667vw, 18.3467px);
```

转换规则：

- 设计稿基准宽度：`375px`
- 最小适配宽度：`320px`
- 最大缩放宽度：`430px`
- `320px` 到 `430px` 之间使用 `vw` 等比缩放
- 小于 `2px` 的值不转换，确保 `1px` 细线清晰
- 边框、阴影、轮廓保持 `px`
- `node_modules` 中的第三方样式不转换
- 超过 `430px` 后停止放大，兼容桌面调试和窄屏平板

如某条尺寸必须保持固定，在声明前增加注释：

```css
/* px-to-vw-ignore */
min-width: 320px;
```

转换器位于 `scripts/postcss-px-to-responsive-vw.mjs`。
