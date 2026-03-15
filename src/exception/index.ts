import { IS_EXCEPTION_HANDLER } from "../contants";
import type { ExceptionHandler } from "./index.types";

export function composeException(
	cb: ExceptionHandler,
): ExceptionHandler {
	Object.defineProperty(cb, IS_EXCEPTION_HANDLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return cb;
}
