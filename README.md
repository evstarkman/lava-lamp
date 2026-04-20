# LavaLamp

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()
[![Bundle Size](https://img.shields.io/badge/size-~8KB-blue.svg)]()

A self-contained, physics-driven lava lamp component with real-time volumetric lighting and dynamic text illumination. Zero dependencies. No build step. Works everywhere.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Text Illumination](#text-illumination)
- [CSS Variables](#css-variables)
- [Examples](#examples)
- [Browser Support](#browser-support)
- [License](#license)

---

## Features

- **Custom Physics Engine** — Real-time fluid simulation with thermodynamic convection, buoyancy, and viscous blob merging via SVG gooey filters.
- **Volumetric Lighting** — Dual-canvas rendering system with geometric raycasting that projects dynamic shadows around the lamp structure.
- **Text Illumination API** — One-line `reveal()` call makes any DOM element invisible until the lamp's light sweeps over it.
- **Runtime Color Control** — Change the wax color dynamically via `setColor()`.
- **Zero Dependencies** — Single vanilla JavaScript file. No frameworks, no build tools, no external assets.
- **UMD Module** — Works as a `<script>` tag (global `window.LavaLamp`), CommonJS `require()`, or AMD `define()`.
- **Fully Self-Contained** — The component generates all of its own DOM elements (canvases, SVG filters, wireframe geometry). 

---

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; }
    .scene { width: 100%; height: 100vh; position: relative; display: flex; align-items: flex-end; justify-content: center; }
    h1 { position: absolute; top: 40%; left: 50%; transform: translateX(-50%); font-family: sans-serif; font-size: 2rem; }
  </style>
</head>
<body>
  <div class="scene">
    <h1 id="title">hello world</h1>
    <div id="lamp"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/gh/evstarkman/lava-lamp@latest/lava-lamp.js"></script>
  <script>
    const lamp = new LavaLamp(document.getElementById('lamp'), {
      color: '#5ac8e8'
    });
    lamp.reveal(document.getElementById('title'));
  </script>
</body>
</html>
```

---

## Installation

### CDN (jsdelivr)

```html
<script src="https://cdn.jsdelivr.net/gh/evstarkman/lava-lamp@latest/lava-lamp.js"></script>
```

### Local

Clone the repository and include the file directly:

```bash
git clone https://github.com/evstarkman/lava-lamp.git
```

```html
<script src="path/to/lava-lamp.js"></script>
```

---

## API Reference

### `new LavaLamp(container, options?)`

Creates a new lava lamp instance and renders it inside the provided container element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container` | `HTMLElement` | Yes | The DOM element to render the lamp inside. Should be placed within a positioned parent element that acts as the "scene". |
| `options` | `Object` | No | Configuration options (see [Configuration](#configuration)). |

**Returns:** `LavaLamp` instance.

---

### `lamp.reveal(element)`

Registers a DOM element for dynamic illumination. The element's text content becomes invisible by default and is progressively revealed as the lamp's light sweeps over it.

Internally applies `background-clip: text` with physics-driven `radial-gradient()` layers. For anchor (`<a>`) elements, underlines are automatically suppressed.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `HTMLElement` | Any DOM element containing text content. |

**Example:**

```js
lamp.reveal(document.querySelector('h1'));
lamp.reveal(document.querySelector('.subtitle'));
lamp.reveal(document.querySelector('a.email'));
```

---

### `lamp.unreveal(element)`

Removes the illumination effect from a previously revealed element, restoring its default rendering.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `HTMLElement` | A previously revealed DOM element. |

---

### `lamp.setColor(hex)`

Changes the wax color at runtime. Affects blob rendering, glow emission, and light projection.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `hex` | `string` | A valid hex color string (e.g. `'#ff6633'`). |

**Example:**

```js
lamp.setColor('#ff6633');
```

---

### `lamp.destroy()`

Fully tears down the lamp instance:
- Cancels the animation frame loop
- Removes all generated DOM elements (canvases, SVG filters, wireframe)
- Unreveals all revealed elements
- Removes injected stylesheets
- Clears CSS custom properties from `document.body`
- Removes the `resize` event listener

Safe to call multiple times.

---

## Configuration

All options are optional. Pass as the second argument to the constructor.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | `string` | `'#5ac8e8'` | Initial wax color (hex). |
| `width` | `number` | `180` | Lamp width in pixels. |
| `height` | `number` | `430` | Lamp height in pixels. |
| `blobCount` | `number` | `4` | Number of physics blobs. More blobs = more visual density but higher CPU usage. |
| `glowEnabled` | `boolean` | `true` | Enable the volumetric glow canvas. Set to `false` for a lightweight mode without ambient lighting. |
| `wireframeColor` | `string` | `'#111111'` | SVG wireframe stroke color. |

**Example with all options:**

```js
const lamp = new LavaLamp(document.getElementById('lamp'), {
  color: '#e85a8a',
  width: 180,
  height: 430,
  blobCount: 6,
  glowEnabled: true,
  wireframeColor: '#1a1a1a'
});
```

---

## Text Illumination

The `reveal()` method is the primary mechanism for creating the "flashlight" text effect. When called, the component injects a shared `<style>` tag into the document head containing:

- `color: transparent` — hides the text by default
- `background-image` — stacked `radial-gradient()` layers, one per blob, bound to live CSS custom properties
- `background-clip: text` — clips the gradient to the text shape
- `background-attachment: fixed` — ensures gradient coordinates are relative to the viewport

This means revealed text is only visible where a blob's light radius intersects the element's position.

### Positioning Requirements

For the illumination to align correctly:
- The lamp's container and your text elements should share a common positioned ancestor.
- The scene container should use `position: relative`.
- Text elements can be positioned anywhere on the page — the gradients use viewport-relative (`fixed`) coordinates.

### Dark Background Required

The effect relies on white-on-black contrast. Your page background should be dark (ideally `#000000`) for the text to appear invisible when unlit.

---

## CSS Variables

Each animation frame, the component sets these CSS custom properties on `document.body`:

| Variable | Type | Description |
|----------|------|-------------|
| `--b{i}x` | `px` | Global X position of blob `i` |
| `--b{i}y` | `px` | Global Y position of blob `i` |
| `--b{i}r` | `px` | Tracking radius of blob `i` (light falloff distance) |
| `--b{i}a` | `float` | Light alpha of blob `i` (0–0.4, based on temperature) |

Where `i` ranges from `0` to `blobCount - 1`.

### Advanced: Manual CSS Illumination

If you need more control than `reveal()` provides, you can reference these variables directly in your own CSS:

```css
.custom-element {
  color: transparent;
  -webkit-text-fill-color: transparent;
  background-image:
    radial-gradient(circle at var(--b0x) var(--b0y),
      rgba(255,255,255, var(--b0a)) 0%,
      transparent var(--b0r));
  background-attachment: fixed;
  -webkit-background-clip: text;
  background-clip: text;
}
```

---

## Examples

### Basic Lamp

```js
const lamp = new LavaLamp(document.getElementById('container'));
```

### Color Picker Integration

```js
const lamp = new LavaLamp(document.getElementById('container'));

document.getElementById('color-input').addEventListener('input', (e) => {
  lamp.setColor(e.target.value);
});
```

### Multiple Revealed Elements

```js
const lamp = new LavaLamp(document.getElementById('container'));

document.querySelectorAll('.secret-text').forEach(el => {
  lamp.reveal(el);
});
```

### Cleanup on Page Navigation

```js
const lamp = new LavaLamp(document.getElementById('container'));

window.addEventListener('beforeunload', () => {
  lamp.destroy();
});
```

---

## Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome 69+ | ✅ |
| Firefox 62+ | ✅ |
| Safari 12+ | ✅ |
| Edge 79+ | ✅ |

Requires Canvas 2D, CSS Custom Properties, `mix-blend-mode: screen`, `background-clip: text`, and `mask-image` support.

---

## License

MIT — see [LICENSE](LICENSE).
