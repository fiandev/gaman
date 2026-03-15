import { IS_CONTROLLER } from '../contants';
import type { ContextHTTP, ContextIPC } from '../context/index.types';
import type { ControllerFactory } from './index.types';

export function composeController<
	CTX extends Gaman.Context = ContextHTTP,
	Args extends any[] = any[],
>(factory: ControllerFactory<CTX, Args>): ControllerFactory<CTX, Args> {
	Object.defineProperty(factory, IS_CONTROLLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return factory;
}

