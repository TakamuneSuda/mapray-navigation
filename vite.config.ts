import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { obfuscateToken } from './src/demo/token-obfuscation.js';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const maprayToken = env.mapray_token || env.MAPRAY_TOKEN || '';
	const obfuscatedToken = env.PUBLIC_MAPRAY_TOKEN_OBFUSCATED || obfuscateToken(maprayToken);

	return {
		define: {
			__MAPRAY_TOKEN_OBFUSCATED__: JSON.stringify(obfuscatedToken)
		},
		plugins: [sveltekit()]
	};
});
