import * as querystring from 'node:querystring';
import {
	FormData,
	FormDataEntryValue,
	type IFormDataEntryValue,
} from './formdata';
import { parseMultipart } from '../utils/multipart-parser';
import { FormDataFile } from './formdata/file';
import { HTTP_REQUEST_METADATA } from '../contants';
import { CookieMap } from 'bun';
import { GamanHeader } from './headers';
import { randomId } from '../utils/utils';
import type { Context, Requester } from '../types';

export async function createContext(req: Request): Promise<Context> {
	const method = req.method?.toUpperCase() || 'GET';
	const urlString = req.url || '/';
	const url = new URL(urlString, `http://${req.headers.get('host')}`);
	const headers = new GamanHeader(req.headers);
	const contentType = headers.get('content-type') || '';

	/** FormData state */
	let form: FormData | null = null;
	let bodyBuffer: Buffer;
	let dataSet: Record<string, any> = {};

	const gamanRequest: Requester = {
		id: randomId(),
		method,
		url: url.href,
		pathname: url.pathname,

		body: async () => {
			if (bodyBuffer == null) {
				const arrayBuffer = await req.arrayBuffer();
				bodyBuffer = Buffer.from(arrayBuffer);
			}
			return bodyBuffer;
		},
	};
	const ctx: Context = {
		url,
		cookies: new CookieMap(req.headers.get('cookie') ?? ''),

		get request() {
			return gamanRequest;
		},
		header: (key: string) => headers.get(key),
		headers: headers,

		param: (name) => {
			return ctx.params[name];
		},
		params: Object.create(null), // ini akan di set nanti di route

		query: createQuery(url.searchParams),

		text: async () => {
			if (bodyBuffer == null) {
				bodyBuffer = Buffer.from(await req.arrayBuffer());
			}
			return bodyBuffer.toString();
		},

		formData: async () => {
			if (form !== null) return form;

			if (method === 'GET' || method === 'HEAD') {
				return (form = new FormData());
			}

			if (contentType.includes('application/x-www-form-urlencoded')) {
				const text = await ctx.text();
				form = parseFormUrlEncoded(text);
			} else if (contentType.includes('multipart/form-data')) {
				const buffer = await gamanRequest.body();
				form = await parseMultipartForm(buffer, contentType);
			} else {
				form = new FormData();
			}
			return form;
		},

		input: async (name) => (await ctx.formData()).get(name)?.toString() ?? null,
		inputs: async (name) =>
			((await ctx.formData()).getAll(name) || [])
				.map((s) => s.toString())
				.filter((s) => s != null),
		file: async (name) => (await ctx.formData()).get(name)?.asFile() ?? null,
		files: async (name) =>
			((await ctx.formData()).getAll(name) || [])
				.map((s) => s.asFile())
				.filter((s) => s != null),

		set(k, v) {
			dataSet[k] = v;
		},
		get<T = any>(k: string): T {
			return dataSet[k] as T;
		},
		has(k) {
			return k in dataSet;
		},
		delete(k) {
			delete dataSet[k];
		},

		//base context
		get path() {
			return gamanRequest.pathname;
		},

		json: async <T = any>() => {
			if (
				contentType.includes('application/json') &&
				method !== 'GET' &&
				method !== 'HEAD'
			) {
				try {
					return (await req.json()) as T;
				} catch {
					return {} as T;
				}
			}
			return {} as T;
		},

		// @ts-ignore
		[HTTP_REQUEST_METADATA]: req,
	};
	return ctx;
}

function createQuery(searchParams: URLSearchParams): Context['query'] {
	const queryFn = ((name: string) => {
		const all = searchParams.getAll(name);
		return all.length > 1 ? all : (all[0] ?? '');
	}) as Context['query'];

	// * Copy semua entries ke dalam fungsi agar bisa diakses sebagai object
	for (const [key, value] of searchParams.entries()) {
		if (!(key in queryFn)) {
			(queryFn as any)[key] = value;
		}
	}

	return queryFn;
}

function parseFormUrlEncoded(body: string): FormData {
	const data = querystring.parse(body);
	const result = new FormData();
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) {
			const _values: IFormDataEntryValue[] = value.map((v) => ({
				name: key,
				value: v as string, // Cast to string since querystring.parse returns string | string[]
			}));
			result.setAll(key, _values);
		} else {
			result.set(key, {
				name: key,
				value: (value as string) || '',
			});
		}
	}
	return result;
}

async function parseMultipartForm(
	body: Buffer,
	contentType: string,
): Promise<FormData> {
	const formData = new FormData();
	const match = contentType.match(/boundary="?([^";]+)"?/);
	const boundary = match?.[1];
	if (boundary) {
		for (let part of parseMultipart(body, boundary)) {
			if (part.name) {
				if (part.isText) {
					formData.set(part.name, new FormDataEntryValue(part.name, part.text));
				} else if (part.filename) {
					formData.set(
						part.name,
						new FormDataEntryValue(
							part.name,
							new FormDataFile(part.filename, part.content, {
								type: part.mediaType,
							}),
						),
					);
				}
			}
		}
	}
	return formData;
}
