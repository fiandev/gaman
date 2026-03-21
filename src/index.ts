import { Gaman } from './gaman';
import { Router } from './router';
import type { RouterBuilder } from './types';

export function defineBootstrap(fn: (app: Gaman) => void) {
	const gaman = new Gaman();

	fn(gaman);
}

