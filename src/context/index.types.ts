import type { CookieMap } from 'bun';
import type { FormData } from './formdata';
import type { GamanHeader } from './headers';
import type { FormDataFile } from './formdata/file';
import type { IResponseOptions, Responder } from '../responder';
import type { AppTransportation, HTTP, IPC, Metadata } from '../index.types';

/* -------------------------------------------------------------------------- */
/*                                   Handler                                  */
/* -------------------------------------------------------------------------- */
export type RequestHandler<T = AppTransportation> = (
	c: T extends HTTP ? ContextHTTP : {} & T extends IPC ? ContextIPC : {},
) => any | Promise<any>;

/* -------------------------------------------------------------------------- */
/*                                   Router                                   */
/* -------------------------------------------------------------------------- */

export type QueryValue = any | any[];
export type Query = ((name: string) => QueryValue) & Record<string, QueryValue>;

/**
 * Represents an HTTP request in the GamanJS framework.
 */
export interface Requester<T = AppTransportation> {
	/**
	 * Request Id fot debugging
	 */
	id: string;
	/**
	 * HTTP method (e.g., GET, POST, PUT, DELETE).
	 */
	method: T extends HTTP ? string : never;

	/**
	 * Full request URL including query string and host (e.g., "http://localhost/home?search=test").
	 */
	url: T extends HTTP ? string : never;

	/**
	 * Pathname portion of the URL (e.g., "/home/user"), excludes query string and host.
	 */
	pathname: string;

	/**
	 * Returns the raw request body as a Buffer.
	 *
	 * Useful for binary uploads or low-level processing.
	 */
	body: () => Promise<Buffer<ArrayBufferLike>>;

	/**
	 * Parses the request body as JSON.
	 *
	 * Suitable for
	 * - `Content-Type: application/json`
	 * - `Content-Type: application/x-www-form-urlencoded`.
	 *
	 * @returns A typed JSON object.
	 */
	json: T extends HTTP
		? <T = any>() => Promise<T>
		: <T = any>() => Promise<T> | T;
}

export type ContextType = 'HTTP' | 'IPC';
export type UniversalContext<T = AppTransportation> =
	| ContextHTTP<T>
	| ContextIPC<T>;

export type Context<T = AppTransportation> = {
	/**
	 * Pathname portion of the URL (e.g., "/home/user"), excludes query string and host.
	 */
	path: string;

	send(data: any, initOrStatus?: IResponseOptions | number): Responder;

	/**
	 * get the payload data by json.
	 * @returns A typed JSON object.
	 */
	data: T extends HTTP ? <T = any>() => Promise<T> : <T = any>() => T;

	/**
	 * get the metadata by json.
	 * @returns A typed JSON object
	 */
	metadata: T extends HTTP ? () => Promise<Metadata> : () => Metadata;
};

/* -------------------------------------------------------------------------- */
/* Context HTTP                                */
/* -------------------------------------------------------------------------- */
export interface ContextHTTP<T = HTTP> extends Context<T> {
	url: URL;
	cookies: CookieMap;
	request: Requester<T>;
	set(k: string, v: any): void;
	get<T = any>(k: string): T;
	has(k: string): boolean;
	delete(k: string): void;

	/**
	 * An instance of GamanHeader for easier and normalized access to request headers.
	 */
	headers: GamanHeader;

	/**
	 * Get the value of a specific header (case-insensitive).
	 *
	 * @param key - The header name (e.g., "Content-Type")
	 *
	 * @returns The value of the specified header or null if not present.
	 */
	header: (key: string) => string | null;

	/**
	 * Get a single route parameter by name.
	 *
	 * For example, in route "/user/:id", `param("id")` would return the dynamic value.
	 *
	 * @param name - The name of the route parameter.
	 */
	param: (name: string) => any;

	/**
	 * All route parameters extracted from the dynamic route.
	 *
	 * For example, "/post/:postId/comment/:commentId" => { postId: "123", commentId: "456" }
	 */
	params: Record<string, any>;

	/**
	 * Query parameters parsed from the URL.
	 *
	 * For example, "/search?q=test&page=2" => { q: "test", page: "2" }
	 */
	query: Query;

	/**
	 * Reads the request body as plain text.
	 *
	 * Suitable for `Content-Type: text/plain`.
	 */
	text: () => Promise<string>;

	/**
	 * Parses the request body as FormData.
	 *
	 * Supports `multipart/form-data` and `application/x-www-form-urlencoded`.
	 */
	formData: () => Promise<FormData>;

	/**
	 * Gets a single string value from form data by name.
	 *
	 * Equivalent to `formData().get(name).asString()`.
	 * @param name - The form field name.
	 */
	input: (name: string) => Promise<string | null>;

	/**
	 * Gets a many string values from form data by name.
	 *
	 * Equivalent to `formData().getAll(name).map(asString)`
	 * @param name - The form field name
	 */
	inputs: (name: string) => Promise<Array<string>>;

	/**
	 * Gets a single file value from form data by name
	 *
	 * Equivalent to `formData().get(name).asFile()`
	 * @param name - The form field name
	 */
	file: (name: string) => Promise<FormDataFile | null>;

	/**
	 * Gets a many file values from form data by name
	 *
	 * Equivalent to `Array<formData().get(name).asFile()>`
	 * @param name - The form field name
	 */
	files: (name: string) => Promise<Array<FormDataFile>>;
}

/* -------------------------------------------------------------------------- */
/* Context IPC                                 */
/* -------------------------------------------------------------------------- */
export interface ContextIPC<T = IPC> extends Pick<Context<T>, 'path'> {
	/**
	 * The underlying Bun Socket instance.
	 * Provides low-level access to the connection (e.g., manual termination or metadata).
	 */
	socket: Bun.Socket;

	/**
	 * The resolved route unix (e.g., "/tmp/gaman.sock").
	 */
	unix: string;

	body: () => Buffer<ArrayBufferLike>;

	text: () => string;

	json: () => any;

	send: (
		data: any,
		byteLength?: number,
		byteOffset?: number,
	) => void | Promise<void>;

	/**
	 * Forcibly terminates the socket connection without sending further data.
	 */
	close: () => void;
}
