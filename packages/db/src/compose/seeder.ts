export type SeederHandler = () => Promise<void> | void;

export function composeSeeder(seederName: string, handler: SeederHandler) {
	return handler;
}
