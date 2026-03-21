import { GamanHeader } from './context/header';
import type { Metadata } from './types';
import { Logger } from './utils/logger';

export const DEFAULT_MESSAGES: Record<number, string> = {
	// 1xx Informational
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing',
	103: 'Early Hints',

	// 2xx Success
	200: 'Success',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status',
	208: 'Already Reported',
	226: 'IM Used',

	// 3xx Redirection
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	305: 'Use Proxy',
	306: 'Switch Proxy',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect',

	// 4xx Client Errors
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Payload Too Large',
	414: 'URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Range Not Satisfiable',
	417: 'Expectation Failed',
	418: "I'm a teapot",
	421: 'Misdirected Request',
	422: 'Unprocessable Entity',
	423: 'Locked',
	424: 'Failed Dependency',
	425: 'Too Early',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	451: 'Unavailable For Legal Reasons',

	// 5xx Server Errors
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage',
	508: 'Loop Detected',
	510: 'Not Extended',
	511: 'Network Authentication Required',
};

export interface GamanResponse<T = any> {
	success: boolean;
	message: string;
	data?: T;
	errors?: Record<string, string[]>;
	meta?: Metadata;
}

export class ViewResponse {
	private viewName: string;
	private viewData: Record<string, any>;
	private initOrStatus: IResponseOptions;

	constructor(
		viewName: string,
		viewData: Record<string, any> = {},
		initOrStatus: IResponseOptions = { status: 200 },
	) {
		this.viewName = viewName;
		this.viewData = viewData;
		this.initOrStatus = initOrStatus;
	}

	getName() {
		return this.viewName;
	}

	getData() {
		return this.viewData;
	}

	getOptions() {
		return this.initOrStatus;
	}
}

export interface IResponseOptions {
	status?: number;
	statusText?: string;
	headers?: Record<string, string | string[]>;
	message?: string;
	metadata?: Record<string, any>;
	errors?: Record<string, string | string[]>;
}

export class Responder {
	public view?: ViewResponse;
	public headers: GamanHeader;
	public statusCode: number;
	public statusTextMessage: string;
	public body?: any;

	// Internal states for consistency
	private _data: any = null;
	private _message?: string;
	private _meta: Record<string, any> = {};
	private _errors: Record<string, string | string[]> = {};
	private _isManualBody: boolean = false;

	constructor(body?: any, options: IResponseOptions = {}) {
		this._data = body;
		this.headers = new GamanHeader(new Headers(options.headers as any));
		this.statusCode = options.status || 200;
		this.statusTextMessage = options.statusText || '';
		this._message = options.message;
		this._meta = options.metadata || {};
		this._errors = options.errors || {};
	}

	/**
	 * Internal build logic for consistent response shape
	 */
	private buildBody() {
		if (this._isManualBody) return this.body;

		//! 204 tidak boleh punya body
		if (this.statusCode === 204) {
			return null;
		}

		const payload: any = {
			success: this.statusCode >= 200 && this.statusCode < 300,
			message:
				this._message ?? DEFAULT_MESSAGES[this.statusCode] ?? 'Unknown Status',
		};

		if (this._data !== null && this._data !== undefined) {
			payload.data = this._data;
		}

		if (this._errors && Object.keys(this._errors).length > 0) {
			for (const k in this._errors) {
				const v = this._errors[k];
				if (v) this._errors[k] = Array.isArray(v) ? v : [v];
			}
			payload.errors = this._errors;
		}

		payload.metadata = {
			requestId: Logger.response.requestId, // ! Sementara langsung ambil dari Logger, karna requestId di set pertama kali ketika ada request
			timestamp: new Date().toISOString(),
		};

		if (this._meta && Object.keys(this._meta).length > 0) {
			payload.metadata = {
				...payload.metadata,
				...this._meta,
			};
		}

		return JSON.stringify(payload);
	}

	/**
	 * Used by Gaman engine to get the finalized response body
	 */
	getFinalBody() {
		return this.buildBody();
	}

	// ==========================================
	// FLUENT METHODS (Chaining)
	// ==========================================

	message(msg: string): this {
		this._message = msg;
		return this;
	}

	meta(metaData: Record<string, any>): this {
		this._meta = { ...this._meta, ...metaData };
		return this;
	}

	status(code: number): this {
		this.statusCode = code;
		return this;
	}

	statusText(text: string): this {
		this.statusTextMessage = text;
		return this;
	}

	header(key: string, value: string): this {
		this.headers.set(key, value);
		return this;
	}

	error(errors: Record<string, string | string[]>, message?: string): this {
		this.statusCode = this.statusCode >= 400 ? this.statusCode : 400;
		this._data = null;
		this._message = message || this._message;
		this._errors = errors;
		return this;
	}

	// ==========================================
	// STATIC FACTORY METHODS
	// ==========================================

	static send(
		data: any,
		initOrStatus: IResponseOptions | number = {},
	): Responder {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(data, ops);

		if (!res.headers.has('Content-Type')) {
			res.headers.set('Content-Type', 'application/json; charset=utf-8');
		}

		return res;
	}

	static message(msg: string, initOrStatus: IResponseOptions | number = {}) {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(undefined, {
			...ops,
			message: msg,
		});

		if (!res.headers.has('Content-Type')) {
			res.headers.set('Content-Type', 'application/json; charset=utf-8');
		}

		return res;
	}

	static error(
		errors: Record<string, string | string[]>,
		initOrStatus: IResponseOptions | number = {},
	) {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(undefined, {
			...ops,
		}).error(errors);

		if (!res.headers.has('Content-Type')) {
			res.headers.set('Content-Type', 'application/json; charset=utf-8');
		}

		return res;
	}

	static json(
		data: any,
		initOrStatus: IResponseOptions | number = {},
	): Responder {
		const res = this.send(data, initOrStatus);
		res._isManualBody = true;
		return res;
	}

	static text(
		message: string,
		initOrStatus: IResponseOptions | number = {},
	): Responder {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(message, ops);
		res._isManualBody = true;
		res.body = message;
		res.headers.set('Content-Type', 'text/plain');
		return res;
	}

	static html(
		body: string,
		initOrStatus: IResponseOptions | number = {},
	): Responder {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(body, ops);
		res._isManualBody = true;
		res.body = body;
		res.headers.set('Content-Type', 'text/html');
		return res;
	}

	static render(
		viewName: string,
		viewData: Record<string, any> = {},
		initOrStatus: IResponseOptions = { status: 200 },
	): Responder {
		const res = new Responder(null, {
			...initOrStatus,
			headers: {
				'Content-Type': 'text/html',
				...(initOrStatus.headers || {}),
			},
		});
		res._isManualBody = true;
		res.view = new ViewResponse(viewName, viewData, initOrStatus);
		return res;
	}

	static stream(
		readableStream: any,
		initOrStatus: IResponseOptions | number = {},
	): Responder {
		const ops: IResponseOptions =
			typeof initOrStatus === 'number'
				? { status: initOrStatus }
				: initOrStatus;

		const res = new Responder(readableStream, ops);
		res._isManualBody = true;
		res.body = readableStream;
		res.headers.set('Content-Type', 'application/octet-stream');
		return res;
	}

	static redirect(location: string, statusNumber: number = 302): Responder {
		const res = new Responder(null, { status: statusNumber });
		res._isManualBody = true;
		res.headers.set('Location', location);
		return res;
	}

	// ==========================================
	// STATUS SHORTCUTS (FINISHERS)
	// ==========================================

	/**
	 * Shorthand method to finish request with "200" status code
	 */
	ok(body?: any): this {
		this.statusCode = 200;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "201" status code
	 */
	created(body?: any): this {
		this.statusCode = 201;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "202" status code
	 */
	accepted(body?: any): this {
		this.statusCode = 202;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "204" status code
	 */
	noContent(): this {
		this.statusCode = 204;
		this._data = null;
		this._isManualBody = true;
		this.body = null;
		return this;
	}

	/**
	 * Shorthand method to finish request with "301" status code
	 */
	movedPermanently(location?: string): this {
		this.statusCode = 301;
		if (location) this.headers.set('Location', location);
		return this;
	}

	/**
	 * Shorthand method to finish request with "302" status code
	 */
	movedTemporarily(location?: string): this {
		this.statusCode = 302;
		if (location) this.headers.set('Location', location);
		return this;
	}

	/**
	 * Shorthand method to finish request with "400" status code
	 */
	badRequest(body?: any): this {
		this.statusCode = 400;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "401" status code
	 */
	unauthorized(body?: any): this {
		this.statusCode = 401;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "403" status code
	 */
	forbidden(body?: any): this {
		this.statusCode = 403;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "404" status code
	 */
	notFound(body?: any): this {
		this.statusCode = 404;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "405" status code
	 */
	methodNotAllowed(): this {
		this.statusCode = 405;
		return this;
	}

	/**
	 * Shorthand method to finish request with "429" status code
	 */
	tooManyRequests(body?: any): this {
		this.statusCode = 429;
		if (body !== undefined) this._data = body;
		return this;
	}

	/**
	 * Shorthand method to finish request with "500" status code
	 */
	internalServerError(body?: any): this {
		this.statusCode = 500;
		if (body !== undefined) this._data = body;
		return this;
	}

	// Static shorthands for quick access
	static ok(data: any) {
		return this.send(data).ok();
	}
	static notFound(data?: any) {
		return this.send(data).notFound();
	}
}
