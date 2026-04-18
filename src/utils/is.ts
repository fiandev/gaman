import type { ExceptionHandler, MiddlewareHandler, Router } from '../compose';
import {
	IS_EXCEPTION_HANDLER,
	IS_MIDDLEWARE_HANDLER,
	IS_COMPOSE_ROUTER,
	IS_ROUTES,
	IS_GAMAN_RESPONSE_VIEW,
} from '../contants';
import type { ResponseView, Routes } from '../types';

export function isMiddlewareHandler(v: any): v is MiddlewareHandler {
	return v[IS_MIDDLEWARE_HANDLER] as boolean;
}

export function isExceptionHandler(v: any): v is ExceptionHandler {
	return v[IS_EXCEPTION_HANDLER] as boolean;
}

export function isComposeRouter(v: any): v is Router {
	return v[IS_COMPOSE_ROUTER] as boolean;
}

export function isRoutes(v: any): v is Routes {
	return v[IS_ROUTES] as boolean;
}

export function isResponseView(v: any): v is ResponseView {
	return v[IS_GAMAN_RESPONSE_VIEW] as boolean;
}

export function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return obj != null && typeof obj === 'object' && Symbol.asyncIterator in obj;
}

export function isAsyncGenerator(obj: any): obj is AsyncGenerator {
  const candidate = obj as AsyncGenerator;
  return (
    isAsyncIterable(obj) &&
    typeof candidate.next === 'function' &&
    typeof candidate.throw === 'function'
  );
}
