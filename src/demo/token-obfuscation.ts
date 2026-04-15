const TOKEN_OBFUSCATION_KEY = 'mapray-navigation-demo';

export function obfuscateToken(token: string): string {
	if (!token) {
		return '';
	}

	return Array.from(token, (character, index) => {
		const keyCode = TOKEN_OBFUSCATION_KEY.charCodeAt(index % TOKEN_OBFUSCATION_KEY.length);
		const obfuscated = character.charCodeAt(0) ^ keyCode;
		return obfuscated.toString(16).padStart(2, '0');
	}).join('');
}

export function deobfuscateToken(obfuscatedToken: string): string {
	if (!obfuscatedToken) {
		return '';
	}

	const chunks = obfuscatedToken.match(/.{1,2}/g) ?? [];
	return chunks
		.map((chunk, index) => {
			const keyCode = TOKEN_OBFUSCATION_KEY.charCodeAt(index % TOKEN_OBFUSCATION_KEY.length);
			const value = Number.parseInt(chunk, 16) ^ keyCode;
			return String.fromCharCode(value);
		})
		.join('');
}
