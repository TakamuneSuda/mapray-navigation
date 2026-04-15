# mapray-navigation

Navigation UI for `mapray-js`.

- compass ring rotation
- center drag orbit
- zoom in / out
- home
- north reset

It works with plain `HTML + JavaScript`, raw `mapray.Viewer`, and `@mapray/ui` `StandardUIViewer`.

## Install

```bash
pnpm add mapray-navigation @mapray/mapray-js
```

## Usage

### `mapray.Viewer`

```ts
import mapray from '@mapray/mapray-js';
import { createMaprayNavigation } from 'mapray-navigation';

const viewer = new mapray.Viewer(container, {
	dem_provider: new mapray.CloudDemProvider(MAPRAY_ACCESS_TOKEN)
});

await viewer.init_promise;

createMaprayNavigation(viewer, {
	position: 'top-right'
});
```

### `StandardUIViewer`

```ts
import maprayui from '@mapray/ui';
import { createMaprayNavigation } from 'mapray-navigation';

const stdViewer = new maprayui.StandardUIViewer(container, token);

createMaprayNavigation(stdViewer.viewer, {
	tooltips: {
		compassCenter: 'Drag to orbit',
		compassRing: 'Drag to rotate',
		home: 'Home',
		zoomIn: 'Zoom in',
		zoomOut: 'Zoom out'
	}
});
```

## API

```ts
createMaprayNavigation(viewer, options);
```

The returned instance has:

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
	zoomIn: string;
	zoomOut: string;
};
```

- `enableCompass`: show or hide the compass
- `enableZoomControls`: show or hide the zoom/home buttons
- `position`: widget corner inside the viewer container
- `tooltips`: override tooltip text

## Notes

- framework-agnostic at runtime
- browser-only
- `@mapray/mapray-js` is a peer dependency

## References

- https://github.com/alberto-acevedo/cesium-navigation
- https://github.com/hongfaqiu/cesium-extends
- https://github.com/hongfaqiu/cesium-extends/tree/master/packages/compass
