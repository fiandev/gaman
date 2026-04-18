import { describe, expect, it } from 'bun:test';
import { Res } from './responder';
import { IS_GAMAN_RESPONSE_VIEW } from './contants';

describe('Res', () => {
	describe('json()', () => {
		it('should return JSON response with default status 200', async () => {
			const res = Res.json({ id: 1 });
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			expect(await res.json()).toEqual({ id: 1 });
		});

		it('should accept status as number', async () => {
			const res = Res.json({ ok: true }, 201);
			expect(res.status).toBe(201);
			expect(await res.json()).toEqual({ ok: true });
		});

		it('should accept IResponseOptions object', async () => {
			const res = Res.json({ ok: true }, { status: 202, headers: { 'X-Custom': 'val' } });
			expect(res.status).toBe(202);
			expect(res.headers.get('x-custom')).toBe('val');
		});

		it('should return 404 when data is null', async () => {
			const res = Res.json(null);
			expect(res.status).toBe(404);
		});
	});

	describe('text()', () => {
		it('should return plain text response', async () => {
			const res = Res.text('hello');
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/plain');
			expect(await res.text()).toBe('hello');
		});

		it('should accept status as number', async () => {
			const res = Res.text('created', 201);
			expect(res.status).toBe(201);
		});

		it('should accept IResponseOptions object', async () => {
			const res = Res.text('ok', { status: 200, headers: { 'X-Foo': 'bar' } });
			expect(res.headers.get('x-foo')).toBe('bar');
		});
	});

	describe('html()', () => {
		it('should return HTML response', async () => {
			const res = Res.html('<h1>Hello</h1>');
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			expect(await res.text()).toBe('<h1>Hello</h1>');
		});

		it('should accept status as number', async () => {
			const res = Res.html('<p>ok</p>', 201);
			expect(res.status).toBe(201);
		});
	});

	describe('render()', () => {
		it('should return a ResponseView object', () => {
			const view = Res.render('index.html', { title: 'Home' });
			expect(view.template).toBe('index.html');
			expect(view.data).toEqual({ title: 'Home' });
			expect((view as any)[IS_GAMAN_RESPONSE_VIEW]).toBe(true);
		});

		it('should use default empty data and status 200', () => {
			const view = Res.render('page.html');
			expect(view.data).toEqual({});
			expect(view.options).toEqual({ status: 200 });
		});

		it('should accept status as number via init', () => {
			const view = Res.render('page.html', {}, 201);
			expect(view.options).toEqual({ status: 201 });
		});

		it('should not expose IS_GAMAN_RESPONSE_VIEW in enumerable keys', () => {
			const view = Res.render('page.html');
			expect(Object.keys(view)).not.toContain(IS_GAMAN_RESPONSE_VIEW);
		});
	});

	describe('stream()', () => {
		it('should return octet-stream response', async () => {
			const body = new TextEncoder().encode('binary data');
			const res = Res.stream(body);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/octet-stream');
		});

		it('should accept status as number', () => {
			const res = Res.stream(new Uint8Array(), 206);
			expect(res.status).toBe(206);
		});
	});

	describe('redirect()', () => {
		it('should return redirect with default 302', () => {
			const res = Res.redirect('/home');
			expect(res.status).toBe(302);
			expect(res.headers.get('location')).toBe('/home');
		});

		it('should accept status as number', () => {
			const res = Res.redirect('/new', 301);
			expect(res.status).toBe(301);
			expect(res.headers.get('location')).toBe('/new');
		});
	});

	describe('ok()', () => {
		it('should return 200 with JSON when body is object', async () => {
			const res = Res.ok({ success: true });
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ success: true });
		});

		it('should return 200 with text when body is string', async () => {
			const res = Res.ok('done');
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/plain');
			expect(await res.text()).toBe('done');
		});
	});

	describe('created()', () => {
		it('should return 201 with JSON when body is object', async () => {
			const res = Res.created({ id: 42 });
			expect(res.status).toBe(201);
			expect(await res.json()).toEqual({ id: 42 });
		});

		it('should return 201 with HTML when body is string', async () => {
			const res = Res.created('created');
			expect(res.status).toBe(201);
			expect(res.headers.get('content-type')).toContain('text/html');
		});

		it('should return 201 with no body when undefined', async () => {
			const res = Res.created();
			expect(res.status).toBe(201);
		});
	});

	describe('noContent()', () => {
		it('should return 204 with no body', async () => {
			const res = Res.noContent();
			expect(res.status).toBe(204);
			expect(await res.text()).toBe('');
		});
	});

	describe('resetContent()', () => {
		it('should return 205', () => {
			const res = Res.resetContent();
			expect(res.status).toBe(205);
		});
	});

	describe('notModified()', () => {
		it('should return 304', () => {
			const res = Res.notModified();
			expect(res.status).toBe(304);
		});
	});

	describe('HTTP error shorthands', () => {
		const cases: Array<[string, number, string | object | undefined]> = [
			['badRequest', 400, 'Bad input'],
			['badRequest', 400, { field: 'name' }],
			['unauthorized', 401, 'Unauthorized'],
			['forbidden', 403, { error: 'forbidden' }],
			['notFound', 404, 'Not found'],
			['methodNotAllowed', 405, undefined],
			['conflict', 409, 'Conflict'],
			['gone', 410, undefined],
			['unprocessableEntity', 422, { field: 'invalid' }],
			['tooManyRequests', 429, 'Slow down'],
			['internalServerError', 500, 'Server crash'],
			['notImplemented', 501, undefined],
			['badGateway', 502, undefined],
			['serviceUnavailable', 503, 'Maintenance'],
			['gatewayTimeout', 504, undefined],
		];

		for (const [method, status, body] of cases) {
			it(`${method}() should return status ${status}`, () => {
				const res = (Res as any)[method](body);
				expect(res.status).toBe(status);
			});
		}

		it('notFound() with string body should return HTML', async () => {
			const res = Res.notFound('Missing');
			expect(res.headers.get('content-type')).toContain('text/html');
			expect(await res.text()).toBe('Missing');
		});

		it('internalServerError() with object body should return JSON', async () => {
			const res = Res.internalServerError({ error: 'crash' });
			expect(res.headers.get('content-type')).toContain('application/json');
			expect(await res.json()).toEqual({ error: 'crash' });
		});
	});
});
