import './global.ts';

import type { Route, Routes } from './router/index.types';
import { composeRoutes, Router } from './router';
import { isMiddleware, isRoutes } from './utils/is';
import type { Middleware, MiddlewareHandler } from './middleware/index.types';
import type { Context, RequestHandler } from './context/index.types';
import { createContext } from './context';
import { Priority } from './enums';
import { insertAndSort, sortArrayByPriority } from './utils/priority';
import { shouldRunMiddleware } from './utils/should-middleware';
import { Responder } from './responder';
import { IGNORED_LOG_FOR_PATH_REGEX } from './contants';
import { Logger } from './utils/logger';

globalThis.Res = Responder;
globalThis.Log = Logger;
export interface GamanResponse<T = any> {
	status: number;
	message: string;
	data: T | null;
	errors: any | null;
}

export function Gaman() {
	const middlewares: Middleware[] = [];
	const monitorMiddlewares: Array<Middleware> = [];

	// ? dynamicRoutes biasanya ada parameter atau custom kek /*splat {/*splat} dll lah itu termasuk dynamic
	// ? karna butuh validasi lebih buat nyarinya jadi kita pisahin
	const dynamicRoutes: Array<Route> = [];

	// ? staticRoutes data static saja kek path /user/setting dan method POST GET dll
	// ? benefitnya gampang di cari proses jadi agak cepat
	const staticRoutes = new Map<string, Map<string, Route>>();

	const pathCheckCache = new Map<string, boolean>();
	function isDynamicPath(path: string): boolean {
		const cached = pathCheckCache.get(path);
		if (cached !== undefined) return cached;

		// Buat instance URLPattern
		// Kita cuma peduli sama pathname, jadi base URL-nya bebas (pake dummy)
		const pattern = new URLPattern({ pathname: path });

		/**
		 * Strategi:
		 * URLPattern punya internal logic buat misahin bagian statis dan dinamis.
		 * Kita bisa cek apakah di dalam pathname ada karakter spesial URLPattern:
		 * 1. ":" (untuk named params)
		 * 2. "*" (untuk wildcard)
		 * 3. "{" (untuk optional/regex grouping)
		 * 4. "(" (untuk manual regex)
		 */
		const dynamicRegex = /[:*{(]/;
		const result = dynamicRegex.test(pattern.pathname);

		pathCheckCache.set(path, result);
		return result;
	}

	function findRoute(
		path: string,
		method: string,
	): { route: Route | undefined; params: any } {
		// * 1. cek static
		const methodsMap = staticRoutes.get(path);
		if (methodsMap) {
			const route =
				methodsMap.get(method.toUpperCase()) || methodsMap.get('ALL');
			if (route) return { route, params: {} };
		}

		// * 2. cek dynamic
		for (const route of dynamicRoutes) {
			if (
				!route.methods.length ||
				route.methods.includes('ALL') ||
				route.methods.includes(method.toUpperCase() as any)
			) {
				const result = route.match.exec(path);
				if (result) {
					return { route, params: result.pathname.groups };
				}
			}
		}

		return { route: undefined, params: {} };
	}

	/**
	 * @ID
	 * Menangani class Response sebelum dikirim ke client
	 * GamanJS akan memakai class Responder sendiri untuk membuat response itu menjadi sederhada, seperti: Res.json Res.text dll
	 *
	 * @param responder
	 * @param ctx
	 * @returns
	 */
	async function handleResponse(
		responder: Responder | undefined,
		ctx?: Context,
	) {
		let finalResponse = responder
			? new Response(responder.getFinalBody(), {
					headers: responder.headers.toRecord(),
					status: responder.statusCode,
					statusText: responder.statusTextMessage,
				})
			: new Response('Not Found', { status: 404 });

		if (ctx) {
			for (const [key, [value, isSet]] of ctx.headers.entries()) {
				if (isSet && value) {
					finalResponse.headers.set(
						key,
						Array.isArray(value) ? value.join(', ') : value,
					);
				}
			}

			const cookieHeaders = ctx.cookies.toSetCookieHeaders();
			for (const cookieStr of cookieHeaders) {
				finalResponse.headers.append('Set-Cookie', cookieStr);
			}
		}

		finalResponse.headers.set('X-Powered-By', 'GamanJS');

		Logger.setStatus(finalResponse.status);
		return finalResponse;
	}

	return {
		...Router(),

		mountRouter: (rts: Routes) => {
			for (const route of rts) {
				if (isDynamicPath(route.path)) {
					dynamicRoutes.push(route);
				} else {
					if (!staticRoutes.has(route.path)) {
						staticRoutes.set(route.path, new Map());
					}
					const methodsMap = staticRoutes.get(route.path)!;

					if (route.methods.length === 0 || route.methods.includes('ALL')) {
						// ! Simpan 'ALL' sebagai fallback
						methodsMap.set('ALL', route);
					} else {
						for (const method of route.methods) {
							methodsMap.set(method.toUpperCase(), route);
						}
					}
				}
			}
		},

		mountMiddleware: (...mws: Middleware[]) => {
			for (const mw of mws) {
				if (!isMiddleware(mw)) {
					throw new Error('Please use composeMiddleware');
				}
				if (mw.config.priority === Priority.MONITOR) {
					monitorMiddlewares.push(mw);
				} else {
					insertAndSort(middlewares, mw, (mw) => mw.config.priority);
				}
			}
		},

		listen(port: number = 3431, host: string = 'localhost') {
			// Register default routes
			const useable_routes = composeRoutes((r) => {
				this.getRoutes().forEach((route) => r.getRoutes().push(route));
			});
			this.mountRouter(useable_routes);
			Logger.info(`GamanJS Remake - Secure & Structured`);
			// console.log(`\n🛡️  GamanJS Remake - Secure & Structured`);
			// console.log(`🚀 Server running at: http://localhost:${port}\n`);

			Bun.serve({
				port,
				hostname: host,
				async fetch(req) {
					const url = new URL(req.url);
					const method = req.method.toUpperCase();
					const startTime = performance.now();
					const ctx = await createContext(req);
					
					//! add request id to header
					ctx.headers.set('X-Request-ID', ctx.request.id);

					// ? Build Pipeline: monitor middlewares
					const pipeline: Array<MiddlewareHandler | RequestHandler> =
						monitorMiddlewares
							.filter((mw) =>
								shouldRunMiddleware(mw, ctx.request.pathname, method),
							)
							.map((mw) => mw.handler);
					Logger.setRequestId(ctx.request.id);
					Logger.setRoute(ctx.request.pathname || '/');
					Logger.setMethod(method);

					let route: Route | undefined;
					try {
						let index = -1;
						let done_find_route = false;
						const next = async (i: number): Promise<Responder> => {
							if (i <= index) {
								throw new Error('next() called multiple times');
							}
							index = i;

							let fn = pipeline[i];

							/**
							 * ? jika next nya kosong dan `done_find_route` juga false maka saatnya nyari route
							 * ? Karna sebelumnya kan jalanin `MONITOR_MIDDLEWARES`
							 */
							if (!fn && !done_find_route) {
								done_find_route = true;
								// ? mencari route yang cocok
								const { route: r, params } = findRoute(url.pathname, method);
								if (!r?.handler) {
									return new Responder(undefined, { status: 404 });
								}

								route = r; // ! set route
								ctx.request.params = params; // ! set params

								// **** MIDDLEWARE ****
								// ? filter global middlewares dari options kek includes: [] dan excludes: []
								const activeMiddlewares = middlewares
									.filter((mw) =>
										shouldRunMiddleware(mw, ctx.request.pathname, method),
									)
									.map((m) => m.handler);

								pipeline.push(
									...activeMiddlewares, // ? middleware harus paling awal
									// ...interceptorData.getInterceptors().map((i) => i.handler),
									...r.pipes,
								);

								fn = pipeline[i]; // ! set ulang
							}

							if (!fn) return new Responder(undefined, { status: 404 });
							return await fn(ctx, () => next(i + 1));
						};

						const result = await next(0);
						return await handleResponse(result as Responder, ctx);
					} catch (error: any) {
						// ? init context on http exception
						// if (error instanceof HttpException) {
						// 	Object.defineProperty(error, 'context', {
						// 		value: ctx,
						// 		writable: true,
						// 		configurable: true,
						// 		enumerable: true,
						// 	});
						// }

						// for (const runExceptionHandler of [
						// 	...exceptionData.getExceptionHandlers(),
						// 	...(route?.exceptions || []),
						// ]) {
						// 	// ? run exception handler
						// 	const response = await runExceptionHandler(error);

						// 	if (response instanceof Response) {
						// 		// ? if exception handler have a response like: Res.json or else
						// 		// ? so handleResponse
						// 		return await this.handleResponse(response, res, ctx);
						// 	}
						// }

						/**
						 * ? Jika error adalah dari interceptor
						 * ? maka akan di kasih default response seperti berikut
						 * ? bisa di rewrite tinggal buat `composeExceptionHandler` aja
						 */
						// if (error instanceof InterceptorException) {
						// 	return await this.handleResponse(
						// 		Res.json(
						// 			{
						// 				statusCode: error.statusCode,
						// 				message: error.message,
						// 			},
						// 			error.statusCode,
						// 		),
						// 		res,
						// 		ctx,
						// 	);
						// }

						Logger.error(error.message);
						console.error(error.details);
						return await handleResponse(
							new Responder(undefined, { status: 500 }),
							ctx,
						);
					} finally {
						const endTime = performance.now();
						if (
							Logger.response.route &&
							Logger.response.status &&
							Logger.response.method &&
							!IGNORED_LOG_FOR_PATH_REGEX.test(Logger.response.route)
						) {
							Logger.log(
								`Request processed in §a(${(endTime - startTime).toFixed(1)}ms)§r`,
							);
						}
						Logger.setRoute('');
						Logger.setMethod('');
						Logger.setStatus(null);
					}
				},
			});
		},
	};
}

export default Gaman();
