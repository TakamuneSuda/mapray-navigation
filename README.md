# mapray-navigation

`mapray-navigation` is a compact navigation UI for `mapray-js`.

It attaches to an existing `mapray.Viewer` and provides:

- a rotatable compass
- center drag for orbit-style camera control
- zoom in / zoom out buttons
- a home button that restores the initial camera state
- north reset from the compass center
- lock / unlock and destroy APIs

The UI is inspired by Cesium navigation widgets, but implemented for Mapray.

## Install

```bash
pnpm add mapray-navigation @mapray/mapray-js
```

## Basic usage

### Raw `mapray.Viewer`

```ts
import mapray from '@mapray/mapray-js';
import { createMaprayNavigation } from 'mapray-navigation';

const viewer = new mapray.Viewer(container, {
	dem_provider: new mapray.CloudDemProvider(MAPRAY_ACCESS_TOKEN),
	image_provider: new mapray.StandardImageProvider({
		url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/',
		format: 'jpg',
		min_level: 2,
		max_level: 18
	})
});

await viewer.init_promise;

const navigation = createMaprayNavigation(viewer, {
	position: 'top-right'
});
```

### `StandardUIViewer`

Pass the same `viewer` instance you already use elsewhere:

```ts
import maprayui from '@mapray/ui';
import { createMaprayNavigation } from 'mapray-navigation';

const stdViewer = new maprayui.StandardUIViewer(container, token);
const navigation = createMaprayNavigation(stdViewer.viewer, {
	tooltips: {
		compassCenter: 'Drag to orbit',
		compassRing: 'Drag to rotate',
		home: 'Back to home',
		resetNorth: 'Back to north',
		zoomIn: 'Zoom closer',
		zoomOut: 'Zoom farther'
	}
});
```

## Custom font

To use a custom font without bundling font files into this package, override the CSS variable:

```css
:root {
	--mapray-navigation-font-family: 'Lexend Giga', sans-serif;
}
```

The icon size can also be customized through the SVG assets themselves, and the CSS is set up so SVG dimensions can take priority.

## API

### `createMaprayNavigation(viewer, options)`

Creates the widget, appends it to `viewer.container_element`, and stores the instance on `viewer.maprayNavigation`.

### `attachMaprayNavigation(viewer, options)`

Alias of `createMaprayNavigation`.

### `viewerMaprayNavigationMixin(viewer, options)`

Cesium-style naming for consumers who want a migration-friendly API.

### `MaprayNavigation`

The returned instance exposes:

- `zoomIn()`
- `zoomOut()`
- `goHome()`
- `rotateLeft()`
- `rotateRight()`
- `resetNorth()`
- `setNavigationLocked(flag)`
- `getNavigationLocked()`
- `destroy()`

## Options

```ts
type MaprayNavigationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type MaprayNavigationOptions = {
	enableCompass?: boolean;
	enableZoomControls?: boolean;
	position?: MaprayNavigationPosition;
	tooltips?: Partial<MaprayNavigationTooltips>;
};
```

```ts
type MaprayNavigationTooltips = {
	compassCenter: string;
	compassRing: string;
	home: string;
	resetNorth: string;
	zoomIn: string;
	zoomOut: string;
};
```

- `enableCompass`
  Enables the compass widget.
- `enableZoomControls`
  Enables the vertical zoom and home button stack.
- `position`
  Chooses which corner of the viewer container the UI is attached to.
- `tooltips`
  Overrides tooltip text for the visible controls.

`tooltips.resetNorth` is currently kept for backward compatibility, but the current UI does not render a dedicated reset-north button. Clicking the compass center uses `compassCenter` instead.

All properties in `MaprayNavigationOptions` are optional. Calling `createMaprayNavigation(viewer)` with no second argument is valid.

## How it works

- With a raw `Viewer`, the library updates `viewer.camera` directly.
- With `StandardUIViewer`, it auto-detects the controller through `viewer.render_callback` and uses the `StandardUIViewer` camera API.
- The compass rotates with the current heading.
- Dragging the outer ring rotates the view.
- Dragging the compass center performs orbit-style camera movement.
- Clicking the compass center resets heading to north.
- The home button restores the camera state captured when the navigation instance was created.

## Debug page

This repository includes a minimal `/debug` page that starts a viewer from an environment variable.

```bash
cp .env.example .env
```

Then set:

```bash
mapray_token=YOUR_MAPRAY_ACCESS_TOKEN
```

Run:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173/debug
```

`MAPRAY_TOKEN` is also accepted as a fallback.

## Notes

- This package is browser-oriented because it manipulates DOM elements and a live `mapray.Viewer`.
- `@mapray/mapray-js` is a peer dependency.

## Referenced Cesium repositories

The design and interaction model in this project were informed by the following Cesium-related repositories:

- `alberto-acevedo/cesium-navigation`
  https://github.com/alberto-acevedo/cesium-navigation
- `hongfaqiu/cesium-extends`
  https://github.com/hongfaqiu/cesium-extends
- `hongfaqiu/cesium-extends/packages/compass`
  https://github.com/hongfaqiu/cesium-extends/tree/master/packages/compass
