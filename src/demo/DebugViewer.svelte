<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { deobfuscateToken } from './token-obfuscation.js';

	let hostElement = $state<HTMLDivElement | null>(null);
	let cleanup: (() => void) | null = null;

	const maprayToken = deobfuscateToken(__MAPRAY_TOKEN_OBFUSCATED__);

	function destroyDebug() {
		cleanup?.();
		cleanup = null;
	}

	async function createDebugViewer() {
		if (!maprayToken.trim()) {
			console.error(
				'Missing mapray token. Set mapray_token or MAPRAY_TOKEN before building the demo.'
			);
			return;
		}

		if (!hostElement) {
			console.error('Debug host element is not available.');
			return;
		}

		destroyDebug();

		try {
			const [{ default: maprayui }, { createMaprayNavigation }] = await Promise.all([
				import('@mapray/ui'),
				import('../lib/index.js')
			]);

			const stdViewer = new maprayui.StandardUIViewer(hostElement, maprayToken);

			await stdViewer.viewer.init_promise;

			stdViewer.setCameraPosition({
				longitude: 139.73685,
				latitude: 35.68,
				height: 1000
			});

			stdViewer.setLookAtPosition({
				longitude: 139.73685,
				latitude: 35.689777,
				height: 0
			});

			stdViewer.setCameraParameter({
				fov: 46.0
			});

			const navigation = createMaprayNavigation(stdViewer.viewer);

			cleanup = () => {
				navigation.destroy();
				stdViewer.destroy();
			};
		} catch (error) {
			console.error('Failed to initialize debug viewer.', error);
			destroyDebug();
		}
	}

	onMount(() => {
		void createDebugViewer();
	});

	onDestroy(() => {
		destroyDebug();
	});
</script>

<svelte:head>
	<title>mapray-navigation demo</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Lexend+Giga:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div bind:this={hostElement} class="viewer"></div>

<style>
	:global(html, body) {
		margin: 0;
		width: 100%;
		height: 100%;
	}

	:global(body) {
		overflow: hidden;
	}

	:global(:root) {
		--mapray-navigation-font-family: 'Lexend Giga', sans-serif;
	}

	.viewer {
		width: 100vw;
		height: 100vh;
		background: #0d3554;
	}
</style>
