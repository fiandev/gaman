import { Logger } from './utils/logger.js';
import { Res } from './responder.js';

globalThis.Log = Logger;
globalThis.Res = Res;

declare global {
	var Log: typeof import('./utils/logger.js').Logger;
	var Res: typeof import('./responder.js').Res;

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
