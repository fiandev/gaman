import './global.ts';

import type { Route, Routes } from './router/index.types';
import { composeRoutes, Router } from './router';
import { isMiddleware } from './utils/is';
import type { Middleware, MiddlewareHandler } from './middleware/index.types';
import type {
	ContextHTTP,
	ContextIPC,
	RequestHandler,
	UniversalContext,
} from './context/index.types';
import { createContext } from './context';
import { Priority } from './enums';
import { insertAndSort, sortArrayByPriority } from './utils/priority';
import { shouldRunMiddleware } from './utils/should-middleware';
import { Responder } from './responder';
import { IGNORED_LOG_FOR_PATH_REGEX } from './contants';
import { Logger } from './utils/logger';
import type {
	AppTransportation,
	HTTP,
	HttpConfig,
	IPC,
	Metadata,
	RunConfig,
} from './index.types.ts';
import { randomId } from './utils/utils.ts';
import { GamanPacker } from './utils/gaman-packer.ts';

export function Gaman<T = AppTransportation>() {
	const middlewares: Middleware[] = [];
	const monitorMiddlewares: Array<Middleware> = [];

	// ? dynamicRoutes biasanya ada parameter atau custom kek /*splat {/*splat} dll lah itu termasuk dynamic
	// ? karna butuh validasi lebih buat nyarinya jadi kita pisahin
	const dynamicRoutes: Array<Route<any>> = [];

	// ? staticRoutes data static saja kek path /user/setting dan method POST GET dll
	// ? benefitnya gampang di cari proses jadi agak cepat
	const staticRoutes = new Map<string, Map<string, Route<any>>>();

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

	function findIpcRoutes() {
		const routers: Route<IPC>[] = [];
		for (const map of staticRoutes.values()) {
			routers.push(...map.values().filter((r) => r.contextType === 'IPC'));
		}
		return routers;
	}

	function findRoute(
		path: string,
		method: string,
	): { route: Route<AppTransportation> | undefined; params: any } {
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
				// ! hack
				const hackBaseUrl = 'https://gamanjs.id' + path;
				const result = route.match.exec(hackBaseUrl);
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
		ctx?: ContextHTTP<HTTP>,
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

	/**
	 * Internal logic to start the Bun HTTP server
	 * Handles both shorthand (number) and full configuration objects.
	 */
	function listenHttp(http: number | HttpConfig) {
		// 1. Normalize configuration
		const isNumber = typeof http === 'number';
		const port = isNumber ? http : http.port;
		const hostname = isNumber ? 'localhost' : http.host || 'localhost';
		const maxRequestBodySize = isNumber ? undefined : http.maxRequestBodySize;
		const development = isNumber ? undefined : http.development;
		const reusePort = isNumber ? undefined : http.reusePort;

		Bun.serve({
			port,
			hostname,
			maxRequestBodySize,
			development,
			reusePort,
			async fetch(req) {
				const url = new URL(req.url);
				const method = req.method.toUpperCase();
				const startTime = performance.now();
				const ctx = await createContext(req);

				//! add request id to header
				ctx.headers.set('X-Request-ID', ctx.request.id);

				// ? Build Pipeline: monitor middlewares
				const pipeline: Array<MiddlewareHandler | RequestHandler<HTTP>> =
					monitorMiddlewares
						.filter((mw) =>
							shouldRunMiddleware(mw, ctx.request.pathname, method),
						)
						.map((mw) => mw.handler);
				Logger.setRequestId(ctx.request.id);
				Logger.setRoute(ctx.request.pathname || '/');
				Logger.setMethod(method);

				let route: Route<HTTP> | undefined;
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
							ctx.params = params; // ! set params

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
						return await fn(ctx as any, () => next(i + 1));
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
	}

	function listenIPC() {
		for (const route of findIpcRoutes()) {
			const ipc = route.options ?? {};

			const unix = route.path;
			const unlink = ipc.unlink ?? true;
			const allowHalfOpen = ipc.allowHalfOpen;

			// remove unix file if exists
			if (unlink) {
				const fs = require('node:fs');
				if (fs.existsSync(unix)) fs.unlinkSync(unix);
			}

			// ? redirectable
			const _path = require('node:path');
			const absolutePath = _path.resolve(unix);

			Logger.info(`§bIPC§r   : Socket active at §e${absolutePath}§r`);

			const socketStorage = new Map();

			Bun.listen({
				unix,
				allowHalfOpen,
				socket: {
					async data(socket, rawData) {
						const ctx: ContextIPC = {
							path: unix,
							socket,
							unix,
							json: () => {
								const messages = GamanPacker.parseIPCMessage(
									socket,
									rawData,
									socketStorage,
								);

								for (const [type, payload] of messages) {
									if (type === 0) return payload;
									try {
										return JSON.parse(payload)
									} catch (error) {
										
									}
								}
								return undefined;
							},
							text: () => {
								const messages = GamanPacker.parseIPCMessage(
									socket,
									rawData,
									socketStorage,
								);

								for (const [type, payload] of messages) {
									if (type === 1) return payload;
								}
								return rawData.toString('utf-8');
							},
							body: () => rawData,
							send(data, byteLength, byteOffset) {
								const response = GamanPacker.encode(data);
								socket.write(response, byteOffset, byteLength);
							},
							close: () => socket.end(),
						};

						if (!route.handler) return;
						const result = await route.handler(ctx as any);

						if (result !== undefined) {
							ctx.send(result);
						}
					},
					close(socket) {
						socketStorage.delete(socket);
					},
				},
			});
		}
	}

	return {
		...Router<T>(),

		mountRouter: (rts: Routes<T>) => {
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

		mountServer(config?: RunConfig<T>) {
			//? initial routes Gaman() own
			const useable_routes = composeRoutes<any>((r) => {
				this.getRoutes().forEach((route) => r.getRoutes().push(route));
			});
			this.mountRouter(useable_routes);

			Logger.log(`§l§dGamanJS Framework v2 §r`);
			Logger.info('§o§7The Universal Transport Layer for Your Logic.');
			Logger.log(`§8 —————————————————————————————————————— §r`);

			//? HTTP Server Orchestration
			if (typeof config?.http !== 'undefined') {
				const h =
					typeof config.http === 'number'
						? { port: config.http }
						: (config.http as HttpConfig);

				const host = h.host || 'localhost';
				const port = h.port || 3431;

				Logger.info(`§6HTTP§r  : Listening at §ahttp://${host}:${port}§r`);
				listenHttp(config.http);
			}
			listenIPC();

			Logger.log(`§8 —————————————————————————————————————— §r`);
			Logger.log(`§rOrchestration complete. Ready for requests.\n`);
		},
	};
}
