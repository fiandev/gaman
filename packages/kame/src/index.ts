export { startKame } from './repl';

import { Gaman } from 'gaman';
import { startKame } from './repl';

export function startKameWithGaman(gaman: Gaman) {
	return startKame();
}
