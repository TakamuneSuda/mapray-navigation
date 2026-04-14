import { env } from '$env/dynamic/private';

export function load() {
	return {
		maprayToken: env.mapray_token ?? env.MAPRAY_TOKEN ?? ''
	};
}
