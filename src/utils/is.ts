import { IS_EXCEPTION_HANDLER, IS_MIDDLEWARE, IS_ROUTES } from "../contants";
import type { ExceptionHandler } from "../exception/index.types";
import type { Middleware } from "../middleware/index.types";
import type { Routes } from "../router/index.types";

export function isMiddleware(v: any): v is Middleware {
	return v[IS_MIDDLEWARE] as boolean;
}

export function isExceptionHandler(v: any): v is ExceptionHandler {
	return v[IS_EXCEPTION_HANDLER] as boolean;
}

export function isRoutes(v: any): v is Routes {
	return v[IS_ROUTES] as boolean;
}
