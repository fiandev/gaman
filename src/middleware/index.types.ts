import type { ContextHTTP } from "../context/index.types";
import type { Priority } from "../enums/priority.enum";
import type { Responder } from "../responder";

export type MiddlewareHandler = (
	ctx: ContextHTTP,
	next: () => Responder | Promise<Responder>,
) => Responder | Promise<Responder>;

export interface MiddlewareOptions {
	priority: Priority;
	includes: Array<
		Pick<MiddlewarePathOptions, 'path'> & {
			methods: Array<string>;
			match: URLPattern;
		}
	>;
	excludes: Array<
		Pick<MiddlewarePathOptions, 'path'> & {
			methods: Array<string>;
			match: URLPattern;
		}
	>;
}

export interface Middleware {
	handler: MiddlewareHandler;
	config: MiddlewareOptions;
}

export type MiddlewarePathOptions = {
	path: string;
	method?: string | Array<string>;
};

export type DefaultMiddlewareOptions = {
	/**
	 * @EN If the `Priority` is higher then it will be executed first, and last to change the final response, if it is lower then the opposite is true.
	 * @ID Jika `Priority` lebih tinggi maka dia akan dijalankan paling awal, dan paling akhir untuk mengubah response akhir, kalau paling rendah maka sebaliknya.
	 */
	priority?: Priority;
	/**
	 * @EN `includes` to set which route the middleware will be run on.
	 * @ID `includes` untuk mengatur di route mana middleware akan di jalankan.
	 */
	includes?: Array<string | MiddlewarePathOptions>;
	/**
	 * @EN `includes` to set on which routes the middleware will not be executed.
	 * @ID `includes` untuk mengatur di route mana middleware tidak akan di jalankan.
	 */
	excludes?: Array<string | MiddlewarePathOptions>;
};
