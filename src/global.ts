import { Logger } from './utils/logger.js';

globalThis.Log = Logger;

declare global {
	var Log: typeof import('./utils/logger.js').Logger;

	namespace Bun {
		interface Env extends Gaman.Env {}
	}

	namespace Gaman {
		interface Locals {}
		interface Env {
			NODE_ENV?: 'development' | 'production';
			PORT?: any;
			HOST?: string;
		}
		interface Context {}
	}
}

export {};
