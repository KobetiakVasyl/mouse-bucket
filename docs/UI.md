# UI

The renderer is React with TypeScript in strict mode, styled with Tailwind CSS. The theme is black and white only, with Times New Roman as the font everywhere. Both are set in `app/src/renderer/src/styles/global.css`, which removes Tailwind's default colors and fonts, so nothing else can creep in. On Linux, Liberation Serif stands in for Times New Roman.

The renderer reaches main only through `window.api` (see [ARCHITECTURE.md](ARCHITECTURE.md)). It never imports `electron` or Node modules.

The app currently shows one page with the product name (`app/src/renderer/src/App.tsx`).
