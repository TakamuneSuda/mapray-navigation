import mapray from '@mapray/mapray-js';

const GeoMath = mapray.GeoMath;
const GeoPoint = mapray.GeoPoint;

const STYLE_ID = 'mapray-navigation-style';
const COMPASS_CENTER_ICON = `
<svg width="28" height="28" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M14.5 8A6.5 6.5 0 0 1 8 14.5M14.5 8A6.5 6.5 0 0 0 8 1.5M14.5 8c0 1.657-2.91 3-6.5 3S1.5 9.657 1.5 8m13 0c0-1.657-2.91-3-6.5-3S1.5 6.343 1.5 8M8 14.5A6.5 6.5 0 0 1 1.5 8M8 14.5c1.657 0 3-2.91 3-6.5S9.657 1.5 8 1.5m0 13c-1.657 0-3-2.91-3-6.5s1.343-6.5 3-6.5M1.5 8A6.5 6.5 0 0 1 8 1.5" stroke="currentColor" stroke-width="0.8"></path>
</svg>
`;
const COMPASS_LABELS_ICON = `
<svg viewBox="0 0 108 108" aria-hidden="true" class="mapray-navigation__compass-labels">
  <text class="mapray-navigation__compass-label mapray-navigation__compass-label--north" x="54.5" y="11.5">N</text>
  <text class="mapray-navigation__compass-label mapray-navigation__compass-label--east" x="100" y="56">E</text>
  <text class="mapray-navigation__compass-label mapray-navigation__compass-label--south" x="53" y="99">S</text>
  <text class="mapray-navigation__compass-label mapray-navigation__compass-label--west" x="10" y="54">W</text>
</svg>
`;
const PLUS_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v12m-6-6h12"></path>
</svg>
`;
const MINUS_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 12h12"></path>
</svg>
`;
const HOME_ICON = `
<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" stroke="none" d="M20.25 10a1.25 1.25 0 1 0-2.5 0zm-14 0a1.25 1.25 0 1 0-2.5 0zm13.866 2.884a1.25 1.25 0 0 0 1.768-1.768zM12 3l.884-.884a1.25 1.25 0 0 0-1.768 0zm-9.884 8.116a1.25 1.25 0 0 0 1.768 1.768zM7 22.25h10v-2.5H7zM20.25 19v-9h-2.5v9zm-14 0v-9h-2.5v9zm15.634-7.884l-9-9l-1.768 1.768l9 9zm-10.768-9l-9 9l1.768 1.768l9-9zM17 22.25A3.25 3.25 0 0 0 20.25 19h-2.5a.75.75 0 0 1-.75.75zm-10-2.5a.75.75 0 0 1-.75-.75h-2.5A3.25 3.25 0 0 0 7 22.25z"></path>
</svg>
`;

type MaprayViewer = mapray.Viewer;
type MaprayVector2 = mapray.Vector2;
type MaprayVector3 = mapray.Vector3;

interface MaprayCameraController {
	viewer: mapray.Viewer;
	getCameraAngle(): { pitch: number; roll: number; yaw: number };
	getCameraPosition(): mapray.GeoPointData;
	setCameraAngle(angle: { pitch: number; roll: number; yaw: number }): void;
	setLookAtPosition?(position: mapray.GeoPointData, yaw?: number): void;
	setCameraPosition(position: mapray.GeoPointData): void;
	updateCamera?: () => void;
}

export type MaprayNavigationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MaprayNavigationOptions {
	/** Show the compass UI. */
	enableCompass?: boolean;
	/** Show the vertical zoom / home button stack. */
	enableZoomControls?: boolean;
	/** Corner where the widget is attached inside the viewer container. */
	position?: MaprayNavigationPosition;
	/** Override UI tooltip text. */
	tooltips?: Partial<MaprayNavigationTooltips>;
}

export interface MaprayNavigationTooltips {
	/** Tooltip for the draggable compass center. */
	compassCenter: string;
	/** Tooltip for the draggable compass outer ring. */
	compassRing: string;
	/** Tooltip for the home button. */
	home: string;
	/** Tooltip for the zoom-in button. */
	zoomIn: string;
	/** Tooltip for the zoom-out button. */
	zoomOut: string;
}

interface ResolvedMaprayNavigationOptions {
	enableCompass: boolean;
	enableZoomControls: boolean;
	position: MaprayNavigationPosition;
	tooltips: MaprayNavigationTooltips;
}

type MaprayViewerWithNavigation = MaprayViewer & {
	maprayNavigation?: MaprayNavigation;
};

type MaprayHomeCameraState =
	| {
			type: 'controller';
			angle: { pitch: number; roll: number; yaw: number };
			position: mapray.GeoPointData;
	  }
	| {
			type: 'viewer';
			viewToGocs: number[];
	  };

const DEFAULT_TOOLTIPS: MaprayNavigationTooltips = {
	compassCenter: 'Drag to orbit. Click to reset north',
	compassRing: 'Drag outer ring to rotate',
	home: 'Return to home position',
	zoomIn: 'Zoom in',
	zoomOut: 'Zoom out'
};

const DEFAULT_OPTIONS: ResolvedMaprayNavigationOptions = {
	enableCompass: true,
	enableZoomControls: true,
	position: 'top-right',
	tooltips: DEFAULT_TOOLTIPS
};

const DEFAULT_ROTATE_STEP = 15;
const DEFAULT_ZOOM_FACTOR = 0.65;

const STYLES = `
.mapray-navigation {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  --mapray-navigation-font-family: 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --mapray-navigation-foreground: rgba(255, 255, 255, 0.8);
  --mapray-navigation-surface: radial-gradient(circle at 50% 35%, rgba(32, 32, 36, 0.8), rgba(0, 0, 0, 0.8));
  --mapray-navigation-surface-hover: radial-gradient(circle at 50% 35%, rgba(42, 42, 48, 0.8), rgba(8, 8, 10, 0.8));
  --mapray-navigation-surface-active: radial-gradient(circle at 50% 35%, rgba(24, 24, 28, 0.8), rgba(0, 0, 0, 0.8));
  --mapray-navigation-icon-size: auto;
  --mapray-navigation-compass-icon-size: auto;
}

.mapray-navigation--top-left {
  top: 16px;
  left: 16px;
}

.mapray-navigation--top-right {
  top: 16px;
  right: 16px;
}

.mapray-navigation--bottom-left {
  bottom: 16px;
  left: 16px;
}

.mapray-navigation--bottom-right {
  right: 16px;
  bottom: 16px;
}

.mapray-navigation__panel {
  display: grid;
  justify-items: center;
  gap: 20px;
}

.mapray-navigation__group {
  display: grid;
  pointer-events: auto;
}

.mapray-navigation__compass {
  position: relative;
  width: 108px;
  height: 108px;
  padding: 0;
  opacity: 0.8;
}

.mapray-navigation__compass-ring {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 0;
  border-radius: 999px;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: grab;
}

.mapray-navigation__compass-ring:active {
  cursor: grabbing;
}

.mapray-navigation__compass-rose {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mapray-navigation__compass-rose::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 0.25px solid var(--mapray-navigation-foreground);
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.8);
  mask: radial-gradient(circle, transparent 0 27px, black 27px 54px, transparent 54px);
}

.mapray-navigation__compass-dividers {
  position: absolute;
  inset: 0;
}

.mapray-navigation__compass-dividers::before,
.mapray-navigation__compass-dividers::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.mapray-navigation__compass-dividers::before {
  background:
    repeating-conic-gradient(
      from 0deg,
      var(--mapray-navigation-foreground) 0deg 4deg,
      transparent 4deg 90deg
    );
  mask: radial-gradient(circle, transparent 0 27px, black 27px 34px, transparent 34px);
}

.mapray-navigation__compass-dividers::after {
  background:
    repeating-conic-gradient(
      from 45deg,
      var(--mapray-navigation-foreground) 0deg 2deg,
      transparent 2deg 90deg
    );
  mask: radial-gradient(circle, transparent 0 27px, black 27px 33px, transparent 33px);
}

.mapray-navigation__compass-labels {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.mapray-navigation__compass-label {
  fill: var(--mapray-navigation-foreground);
  font-family: var(--mapray-navigation-font-family);
  font-size: 13px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  text-transform: uppercase;
}

.mapray-navigation__compass-center {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 46px;
  height: 46px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  border: 0.25px solid var(--mapray-navigation-foreground);
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: var(--mapray-navigation-surface);
  color: var(--mapray-navigation-foreground);
  appearance: none;
  -webkit-appearance: none;
  line-height: 1;
}

.mapray-navigation__button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 36px;
  height: 36px;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  border: 0.25px solid var(--mapray-navigation-foreground);
  border-radius: 4px;
  background: var(--mapray-navigation-surface);
  color: var(--mapray-navigation-foreground);
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  line-height: 1;
}

.mapray-navigation__button:hover {
  background: var(--mapray-navigation-surface-hover);
}

.mapray-navigation__button:active {
  background: var(--mapray-navigation-surface-active);
}

.mapray-navigation__button svg,
.mapray-navigation__compass-center svg {
  width: var(--mapray-navigation-icon-size);
  height: var(--mapray-navigation-icon-size);
  max-width: 24px;
  max-height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mapray-navigation__compass-center svg {
  width: var(--mapray-navigation-compass-icon-size);
  height: var(--mapray-navigation-compass-icon-size);
  max-width: 28px;
  max-height: 28px;
  transform-origin: 50% 50%;
}

.mapray-navigation__stack {
  gap: 0;
}

.mapray-navigation__stack .mapray-navigation__button:first-child {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.mapray-navigation__stack .mapray-navigation__button + .mapray-navigation__button {
  margin-top: -1px;
}

.mapray-navigation__stack .mapray-navigation__button:not(:first-child):not(:last-child) {
  border-radius: 0;
}

.mapray-navigation__stack .mapray-navigation__button:last-child {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.mapray-navigation__button:focus-visible,
.mapray-navigation__compass-center:focus-visible,
.mapray-navigation__compass-ring:focus-visible {
  outline: 3px solid rgba(255, 202, 125, 0.8);
  outline-offset: 2px;
}

.mapray-navigation__button[disabled],
.mapray-navigation__compass-center[disabled],
.mapray-navigation__compass-ring[disabled] {
  cursor: not-allowed;
  opacity: 0.55;
}
`;

export interface MaprayNavigation {
	destroy(): void;
	getNavigationLocked(): boolean;
	goHome(): void;
	resetNorth(): void;
	rotateLeft(): void;
	rotateRight(): void;
	setNavigationLocked(locked: boolean): void;
	readonly viewer: MaprayViewer;
	zoomIn(): void;
	zoomOut(): void;
}

function createNavigationInstance(
	viewer: MaprayViewerWithNavigation,
	options: MaprayNavigationOptions = {}
): MaprayNavigation {
	if (!viewer) {
		throw new Error('viewer is required');
	}

	const controller = resolveCameraController(viewer);
	const resolvedOptions: ResolvedMaprayNavigationOptions = {
		...DEFAULT_OPTIONS,
		...options,
		tooltips: {
			...DEFAULT_TOOLTIPS,
			...options.tooltips
		}
	};
	const container = viewer.container_element;

	let compassCenterIcon: SVGSVGElement | undefined;
	let compassRing: HTMLButtonElement | undefined;
	let compassRose: HTMLDivElement | undefined;
	let compassSyncRafId: number | undefined;
	let destroyed = false;
	let locked = false;
	let rotationAnimationRafId: number | undefined;
	let zoomAnimationRafId: number | undefined;

	ensureStyles();

	const computedPosition = window.getComputedStyle(container).position;
	const restoreContainerPosition = computedPosition === 'static' ? container.style.position : null;

	if (restoreContainerPosition !== null) {
		container.style.position = 'relative';
	}

	const root = createRoot();
	const homeCameraState = captureHomeCameraState();
	container.appendChild(root);
	startCompassSync();

	const navigation: MaprayNavigation = {
		destroy,
		getNavigationLocked,
		goHome,
		resetNorth,
		rotateLeft,
		rotateRight,
		setNavigationLocked,
		get viewer() {
			return viewer;
		},
		zoomIn,
		zoomOut
	};

	return navigation;

	function destroy(): void {
		if (destroyed) {
			return;
		}

		destroyed = true;

		if (compassSyncRafId !== undefined) {
			cancelAnimationFrame(compassSyncRafId);
		}
		cancelCameraAnimations();

		root.remove();

		if (restoreContainerPosition !== null) {
			container.style.position = restoreContainerPosition;
		}

		if (viewer.maprayNavigation === navigation) {
			delete viewer.maprayNavigation;
		}
	}

	function getNavigationLocked(): boolean {
		return locked;
	}

	function goHome(): void {
		if (locked) {
			return;
		}

		cancelCameraAnimations();
		restoreHomeCameraState();
	}

	function resetNorth(): void {
		if (locked) {
			return;
		}
		cancelCameraAnimations();

		const heading = readHeading();
		if (heading === 0) {
			return;
		}

		const pivot = getPivotPoint();
		const upAxis = getPivotAxis(pivot);
		startResetNorthAnimation(normalizeSignedDegrees(-heading), pivot, upAxis);
	}

	function rotateLeft(): void {
		startRotateAnimation(-DEFAULT_ROTATE_STEP);
	}

	function rotateRight(): void {
		startRotateAnimation(DEFAULT_ROTATE_STEP);
	}

	function setNavigationLocked(nextLocked: boolean): void {
		locked = nextLocked;
		root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
			button.disabled = nextLocked;
		});
	}

	function zoomIn(): void {
		zoomBy(DEFAULT_ZOOM_FACTOR);
	}

	function zoomOut(): void {
		zoomBy(1 / DEFAULT_ZOOM_FACTOR);
	}

	function createButtonWithMarkup(
		markup: string,
		title: string,
		onClick: () => void
	): HTMLButtonElement {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'mapray-navigation__button';
		button.innerHTML = markup;
		setControlLabel(button, title);
		button.addEventListener('click', () => {
			if (locked || destroyed) {
				return;
			}
			onClick();
		});
		return button;
	}

	function createCompass(): HTMLDivElement {
		const compass = createGroup('mapray-navigation__compass');

		const ring = document.createElement('button');
		ring.type = 'button';
		ring.className = 'mapray-navigation__compass-ring';
		setControlLabel(ring, resolvedOptions.tooltips.compassRing);
		ring.addEventListener('pointerdown', startCompassDrag);
		compassRing = ring;

		const rose = document.createElement('div');
		rose.className = 'mapray-navigation__compass-rose';
		rose.innerHTML = `
			<span class="mapray-navigation__compass-dividers" aria-hidden="true"></span>
			${COMPASS_LABELS_ICON}
		`;
		compassRose = rose;

		const center = document.createElement('button');
		center.type = 'button';
		center.className = 'mapray-navigation__compass-center';
		setControlLabel(center, resolvedOptions.tooltips.compassCenter);
		center.innerHTML = COMPASS_CENTER_ICON;
		compassCenterIcon = center.querySelector('svg') ?? undefined;
		center.addEventListener('pointerdown', startCenterDrag);

		compass.append(ring, rose, center);
		return compass;
	}

	function createGroup(className?: string): HTMLDivElement {
		const element = document.createElement('div');
		element.className = className
			? `mapray-navigation__group ${className}`
			: 'mapray-navigation__group';
		return element;
	}

	function createRoot(): HTMLDivElement {
		const nextRoot = document.createElement('div');
		nextRoot.className = `mapray-navigation mapray-navigation--${resolvedOptions.position}`;

		const panel = document.createElement('div');
		panel.className = 'mapray-navigation__panel';

		if (resolvedOptions.enableCompass) {
			panel.appendChild(createCompass());
		}

		if (resolvedOptions.enableZoomControls) {
			const zoomGroup = createGroup('mapray-navigation__stack');
			zoomGroup.append(
				createButtonWithMarkup(PLUS_ICON, resolvedOptions.tooltips.zoomIn, zoomIn),
				createButtonWithMarkup(HOME_ICON, resolvedOptions.tooltips.home, goHome),
				createButtonWithMarkup(MINUS_ICON, resolvedOptions.tooltips.zoomOut, zoomOut)
			);
			panel.appendChild(zoomGroup);
		}

		nextRoot.appendChild(panel);
		return nextRoot;
	}

	function captureHomeCameraState(): MaprayHomeCameraState {
		if (controller) {
			return {
				type: 'controller',
				angle: { ...controller.getCameraAngle() },
				position: { ...controller.getCameraPosition() }
			};
		}

		return {
			type: 'viewer',
			viewToGocs: Array.from(viewer.camera.view_to_gocs)
		};
	}

	function createScreenCenter(): MaprayVector2 {
		return GeoMath.createVector2([
			viewer.canvas_element.clientWidth / 2,
			viewer.canvas_element.clientHeight / 2
		]);
	}

	function getCameraPositionGocs(): MaprayVector3 {
		if (controller) {
			const position = controller.getCameraPosition();
			const geoPoint = new GeoPoint(position.longitude, position.latitude, position.height);
			const matrix = geoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
			return GeoMath.createVector3([matrix[12], matrix[13], matrix[14]]);
		}

		const matrix = viewer.camera.view_to_gocs;
		return GeoMath.createVector3([matrix[12], matrix[13], matrix[14]]);
	}

	function getFallbackPivotDistance(): number {
		const geoPoint = new GeoPoint();
		geoPoint.setFromGocs(getCameraPositionGocs());

		return Math.max(geoPoint.altitude, 1000) * 0.35;
	}

	function getPivotPoint(): MaprayVector3 {
		const screenCenter = createScreenCenter();
		const pickResult = viewer.pick(screenCenter);
		if (pickResult) {
			return GeoMath.createVector3(pickResult.position);
		}

		const ray = viewer.camera.getCanvasRay(screenCenter);
		const distance = getFallbackPivotDistance();
		return GeoMath.createVector3([
			ray.position[0] + ray.direction[0] * distance,
			ray.position[1] + ray.direction[1] * distance,
			ray.position[2] + ray.direction[2] * distance
		]);
	}

	function getPointerAngle(event: PointerEvent): number | undefined {
		if (!compassRing) {
			return undefined;
		}

		const rect = compassRing.getBoundingClientRect();
		const dx = event.clientX - (rect.left + rect.width / 2);
		const dy = event.clientY - (rect.top + rect.height / 2);

		if (dx === 0 && dy === 0) {
			return undefined;
		}

		return radiansToDegrees(Math.atan2(dy, dx)) + 90;
	}

	function readHeading(): number {
		if (controller) {
			return normalizeDegrees(controller.getCameraAngle().yaw);
		}

		const cameraMatrix = viewer.camera.view_to_gocs;
		const cameraPosition = getCameraPositionGocs();
		const cameraGeoPoint = new GeoPoint();
		cameraGeoPoint.setFromGocs(cameraPosition);

		const localMatrix = cameraGeoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
		const localMatrixInverse = GeoMath.inverse_A(localMatrix, GeoMath.createMatrix());
		const eyeMatrix = GeoMath.mul_AA(localMatrixInverse, cameraMatrix, GeoMath.createMatrix());

		return normalizeDegrees(radiansToDegrees(Math.atan2(eyeMatrix[1], eyeMatrix[0])));
	}

	function getPivotAxis(pivot: MaprayVector3): MaprayVector3 {
		const pivotGeoPoint = new GeoPoint();
		pivotGeoPoint.setFromGocs(pivot);
		const pivotMatrix = pivotGeoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
		const upAxis = GeoMath.createVector3([pivotMatrix[8], pivotMatrix[9], pivotMatrix[10]]);
		GeoMath.normalize3(upAxis, upAxis);
		return upAxis;
	}

	function rotateAroundPivot(deltaYaw: number): void {
		if (locked) {
			return;
		}
		cancelCameraAnimations();

		const pivot = getPivotPoint();
		const upAxis = getPivotAxis(pivot);
		applyRotationDelta(deltaYaw, pivot, upAxis);
	}

	function applyRotationDelta(deltaYaw: number, pivot: MaprayVector3, upAxis: MaprayVector3): void {
		if (deltaYaw === 0) {
			return;
		}

		const cameraMatrix = viewer.camera.view_to_gocs;
		const cameraPosition = getCameraPositionGocs();
		const rotatedPosition = rotateVector(
			GeoMath.sub3(cameraPosition, pivot, GeoMath.createVector3()),
			upAxis,
			deltaYaw
		);
		const nextPosition = GeoMath.add3(pivot, rotatedPosition, GeoMath.createVector3());

		if (controller) {
			setControllerCameraPositionFromGocs(nextPosition);
			setControllerYaw(normalizeDegrees(controller.getCameraAngle().yaw + deltaYaw));
			return;
		}

		rotateBasis(cameraMatrix, upAxis, deltaYaw);
		cameraMatrix[12] = nextPosition[0];
		cameraMatrix[13] = nextPosition[1];
		cameraMatrix[14] = nextPosition[2];
	}

	function orbitAroundPivot(deltaYaw: number, deltaPitch: number): void {
		if (locked) {
			return;
		}

		cancelCameraAnimations();

		const pivot = getPivotPoint();
		const upAxis = getPivotAxis(pivot);
		const cameraPosition = getCameraPositionGocs();
		let offset = GeoMath.sub3(cameraPosition, pivot, GeoMath.createVector3());

		if (deltaYaw !== 0) {
			offset = rotateVector(offset, upAxis, deltaYaw);
		}

		if (deltaPitch !== 0) {
			const rightAxis = GeoMath.cross3(upAxis, offset, GeoMath.createVector3());
			if (GeoMath.length3(rightAxis) > 1.0e-6) {
				GeoMath.normalize3(rightAxis, rightAxis);
				offset = rotateVector(offset, rightAxis, deltaPitch);
			}
		}

		const nextPosition = GeoMath.add3(pivot, offset, GeoMath.createVector3());
		lookAtPivot(nextPosition, pivot, upAxis);
	}

	function lookAtPivot(
		cameraPosition: MaprayVector3,
		pivot: MaprayVector3,
		upAxis: MaprayVector3
	): void {
		if (controller) {
			setControllerCameraPositionFromGocs(cameraPosition);

			if (controller.setLookAtPosition) {
				const pivotGeoPoint = new GeoPoint();
				pivotGeoPoint.setFromGocs(pivot);
				controller.setLookAtPosition({
					longitude: pivotGeoPoint.longitude,
					latitude: pivotGeoPoint.latitude,
					height: pivotGeoPoint.altitude
				});
			}

			updateControllerCamera();
			return;
		}

		GeoMath.lookat_matrix(cameraPosition, pivot, upAxis, viewer.camera.view_to_gocs);
	}

	function startRotateAnimation(totalDeltaYaw: number): void {
		if (locked || totalDeltaYaw === 0) {
			return;
		}

		cancelCameraAnimations();

		const pivot = getPivotPoint();
		const upAxis = getPivotAxis(pivot);
		const durationMs = 180;
		const startTime = performance.now();
		let appliedDeltaYaw = 0;

		const tick = (now: number) => {
			if (destroyed || locked) {
				cancelRotationAnimation();
				return;
			}

			const progress = clamp((now - startTime) / durationMs, 0, 1);
			const targetDeltaYaw = totalDeltaYaw * progress;
			const frameDeltaYaw = targetDeltaYaw - appliedDeltaYaw;
			appliedDeltaYaw = targetDeltaYaw;

			applyRotationDelta(frameDeltaYaw, pivot, upAxis);

			if (progress < 1) {
				rotationAnimationRafId = requestAnimationFrame(tick);
				return;
			}

			rotationAnimationRafId = undefined;
		};

		rotationAnimationRafId = requestAnimationFrame(tick);
	}

	function startResetNorthAnimation(
		totalDeltaYaw: number,
		pivot: MaprayVector3,
		upAxis: MaprayVector3
	): void {
		if (locked || totalDeltaYaw === 0) {
			return;
		}

		cancelRotationAnimation();

		const durationMs = 220;
		const startTime = performance.now();
		let appliedDeltaYaw = 0;

		const tick = (now: number) => {
			if (destroyed || locked) {
				cancelRotationAnimation();
				return;
			}

			const progress = clamp((now - startTime) / durationMs, 0, 1);
			const targetDeltaYaw = totalDeltaYaw * easeInOutCubic(progress);
			const frameDeltaYaw = targetDeltaYaw - appliedDeltaYaw;
			appliedDeltaYaw = targetDeltaYaw;

			applyRotationDelta(frameDeltaYaw, pivot, upAxis);

			if (progress < 1) {
				rotationAnimationRafId = requestAnimationFrame(tick);
				return;
			}

			const residualDeltaYaw = normalizeSignedDegrees(-readHeading());
			if (residualDeltaYaw !== 0) {
				applyRotationDelta(residualDeltaYaw, pivot, upAxis);
			}

			rotationAnimationRafId = undefined;
		};

		rotationAnimationRafId = requestAnimationFrame(tick);
	}

	function rotateBasis(matrix: mapray.Matrix, axis: MaprayVector3, angle: number): void {
		const xAxis = rotateVector(
			GeoMath.createVector3([matrix[0], matrix[1], matrix[2]]),
			axis,
			angle
		);
		const yAxis = rotateVector(
			GeoMath.createVector3([matrix[4], matrix[5], matrix[6]]),
			axis,
			angle
		);
		const zAxis = rotateVector(
			GeoMath.createVector3([matrix[8], matrix[9], matrix[10]]),
			axis,
			angle
		);

		matrix[0] = xAxis[0];
		matrix[1] = xAxis[1];
		matrix[2] = xAxis[2];
		matrix[4] = yAxis[0];
		matrix[5] = yAxis[1];
		matrix[6] = yAxis[2];
		matrix[8] = zAxis[0];
		matrix[9] = zAxis[1];
		matrix[10] = zAxis[2];
	}

	function startCompassDrag(event: PointerEvent): void {
		if (locked || destroyed) {
			return;
		}
		cancelRotationAnimation();

		event.preventDefault();

		const startAngle = getPointerAngle(event);
		if (startAngle === undefined) {
			return;
		}

		let previousAngle = startAngle;

		const onPointerMove = (moveEvent: PointerEvent) => {
			const nextAngle = getPointerAngle(moveEvent);
			if (nextAngle === undefined) {
				return;
			}

			const delta = normalizeSignedDegrees(nextAngle - previousAngle);
			previousAngle = nextAngle;

			if (delta !== 0) {
				rotateAroundPivot(delta);
			}
		};

		const onPointerUp = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, { once: true });
	}

	function startCenterDrag(event: PointerEvent): void {
		if (locked || destroyed) {
			return;
		}

		cancelRotationAnimation();
		event.preventDefault();

		let previousX = event.clientX;
		let previousY = event.clientY;
		let moved = false;

		const onPointerMove = (moveEvent: PointerEvent) => {
			const deltaX = moveEvent.clientX - previousX;
			const deltaY = moveEvent.clientY - previousY;

			previousX = moveEvent.clientX;
			previousY = moveEvent.clientY;

			if (deltaX === 0 && deltaY === 0) {
				return;
			}

			moved = true;
			orbitAroundPivot(-deltaX * 0.15, -deltaY * 0.15);
		};

		const onPointerUp = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);

			if (!moved) {
				resetNorth();
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, { once: true });
	}

	function startCompassSync(): void {
		const tick = () => {
			if (destroyed) {
				return;
			}

			const heading = readHeading();

			if (compassRose) {
				compassRose.style.transform = `rotate(${heading}deg)`;
			}

			if (compassCenterIcon) {
				compassCenterIcon.style.transform = `rotate(${heading}deg)`;
			}

			compassSyncRafId = requestAnimationFrame(tick);
		};

		tick();
	}

	function zoomBy(scale: number): void {
		if (locked) {
			return;
		}

		const pivot = getPivotPoint();
		const cameraPosition = getCameraPositionGocs();
		const offset = GeoMath.sub3(cameraPosition, pivot, GeoMath.createVector3());
		const distance = GeoMath.length3(offset);

		if (distance === 0) {
			return;
		}

		GeoMath.scale3(scale, offset, offset);

		const nextPosition = GeoMath.add3(pivot, offset, GeoMath.createVector3());
		startZoomAnimation(cameraPosition, nextPosition);
	}

	function cancelZoomAnimation(): void {
		if (zoomAnimationRafId !== undefined) {
			cancelAnimationFrame(zoomAnimationRafId);
			zoomAnimationRafId = undefined;
		}
	}

	function cancelRotationAnimation(): void {
		if (rotationAnimationRafId !== undefined) {
			cancelAnimationFrame(rotationAnimationRafId);
			rotationAnimationRafId = undefined;
		}
	}

	function cancelCameraAnimations(): void {
		cancelRotationAnimation();
		cancelZoomAnimation();
	}

	function restoreHomeCameraState(): void {
		if (homeCameraState.type === 'controller') {
			controller?.setCameraPosition({ ...homeCameraState.position });
			controller?.setCameraAngle({ ...homeCameraState.angle });
			updateControllerCamera();
			return;
		}

		const cameraMatrix = viewer.camera.view_to_gocs;
		for (let i = 0; i < homeCameraState.viewToGocs.length; i += 1) {
			cameraMatrix[i] = homeCameraState.viewToGocs[i];
		}
	}

	function setCameraPositionGocs(position: MaprayVector3): void {
		if (controller) {
			setControllerCameraPositionFromGocs(position);
			updateControllerCamera();
			return;
		}

		const cameraMatrix = viewer.camera.view_to_gocs;
		cameraMatrix[12] = position[0];
		cameraMatrix[13] = position[1];
		cameraMatrix[14] = position[2];
	}

	function startZoomAnimation(from: MaprayVector3, to: MaprayVector3): void {
		cancelZoomAnimation();

		const durationMs = 220;
		const startTime = performance.now();
		const start = GeoMath.createVector3(from);
		const end = GeoMath.createVector3(to);

		const tick = (now: number) => {
			if (destroyed || locked) {
				cancelZoomAnimation();
				return;
			}

			const progress = clamp((now - startTime) / durationMs, 0, 1);
			const eased = easeInOutCubic(progress);
			const current = GeoMath.createVector3([
				start[0] + (end[0] - start[0]) * eased,
				start[1] + (end[1] - start[1]) * eased,
				start[2] + (end[2] - start[2]) * eased
			]);

			setCameraPositionGocs(current);

			if (progress < 1) {
				zoomAnimationRafId = requestAnimationFrame(tick);
				return;
			}

			zoomAnimationRafId = undefined;
		};

		zoomAnimationRafId = requestAnimationFrame(tick);
	}

	function setControlLabel(element: HTMLElement, title: string): void {
		element.title = title;
		element.setAttribute('aria-label', title);
	}

	function setControllerCameraPositionFromGocs(position: MaprayVector3): void {
		if (!controller) {
			return;
		}

		const geoPoint = new GeoPoint();
		geoPoint.setFromGocs(position);
		controller.setCameraPosition({
			longitude: geoPoint.longitude,
			latitude: geoPoint.latitude,
			height: geoPoint.altitude
		});
	}

	function updateControllerCamera(): void {
		controller?.updateCamera?.();
	}

	function setControllerYaw(yaw: number): void {
		if (!controller) {
			return;
		}

		const angle = controller.getCameraAngle();
		controller.setCameraAngle({ ...angle, yaw });
		updateControllerCamera();
	}
}

export function createMaprayNavigation(
	viewer: MaprayViewer,
	options: MaprayNavigationOptions = {}
): MaprayNavigation {
	const host = viewer as MaprayViewerWithNavigation;
	host.maprayNavigation?.destroy();

	const navigation = createNavigationInstance(host, options);
	Object.defineProperty(host, 'maprayNavigation', {
		configurable: true,
		value: navigation,
		writable: true
	});

	return navigation;
}

function isCameraController(target: unknown): target is MaprayCameraController {
	return typeof target === 'object' && target !== null && 'getCameraPosition' in target;
}

function resolveCameraController(viewer: MaprayViewer): MaprayCameraController | undefined {
	const renderCallback = viewer.render_callback;
	if (isCameraController(renderCallback)) {
		return renderCallback;
	}

	return undefined;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function easeInOutCubic(value: number): number {
	return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function ensureStyles(): void {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = STYLES;
	document.head.appendChild(style);
}

function normalizeDegrees(value: number): number {
	return ((value % 360) + 360) % 360;
}

function normalizeSignedDegrees(value: number): number {
	const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
	return normalized === -180 ? 180 : normalized;
}

function radiansToDegrees(value: number): number {
	return value / GeoMath.DEGREE;
}

function rotateVector(vector: MaprayVector3, axis: MaprayVector3, angle: number): MaprayVector3 {
	const matrix = GeoMath.rotation_matrix(axis, angle, GeoMath.createMatrix());
	return GeoMath.createVector3([
		vector[0] * matrix[0] + vector[1] * matrix[4] + vector[2] * matrix[8],
		vector[0] * matrix[1] + vector[1] * matrix[5] + vector[2] * matrix[9],
		vector[0] * matrix[2] + vector[1] * matrix[6] + vector[2] * matrix[10]
	]);
}
