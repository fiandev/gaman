/**
 * ==========================================================================
 * GamanJS E2E API Tests
 * ==========================================================================
 *
 * These tests spin up the example server and make real HTTP requests
 * to verify every route, middleware, and exception handler.
 *
 * Run: bun test test/api.test.ts
 * ==========================================================================
 */

import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Subprocess } from 'bun';

const BASE = 'http://localhost:3431';
let server: Subprocess;

beforeAll(async () => {
	server = Bun.spawn(['bun', 'run', 'examples/src/index.ts'], {
		cwd: process.cwd(),
		stdout: 'ignore',
		stderr: 'ignore',
	});
	// Wait for server to be ready
	for (let i = 0; i < 30; i++) {
		try {
			await fetch(`${BASE}/ping`);
			break;
		} catch {
			await Bun.sleep(100);
		}
	}
});

afterAll(() => {
	server?.kill();
});

// ========================= CONTROLLER + SERVICE =========================

describe('Controller + Service routes', () => {
	it('GET / - HelloWorld via AppController', async () => {
		const res = await fetch(`${BASE}/`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBe('❤️ Welcome to GamanJS');
	});

	it('GET /users/:id - GetUser via AppController (URL param)', async () => {
		const res = await fetch(`${BASE}/users/42`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe(42);
		expect(body.name).toBe('User 42');
		expect(body.email).toBe('user42@gaman.dev');
	});

	it('POST /items - CreateItem via AppController (JSON body)', async () => {
		const res = await fetch(`${BASE}/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Test Item'}),
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.title).toBe('Test Item');
		expect(body.created).toBe(true);
		expect(body.id).toBeDefined();
	});
});

// ========================= INLINE HANDLERS =========================

describe('Inline handler routes', () => {
	it('GET /ping - simple text response', async () => {
		const res = await fetch(`${BASE}/ping`);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toBe('pong');
	});

	it('GET /search?q=gaman&page=3 - query params', async () => {
		const res = await fetch(`${BASE}/search?q=gaman&page=3`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.q).toBe('gaman');
		expect(body.page).toBe('3');
	});

	it('GET /search - missing query defaults', async () => {
		const res = await fetch(`${BASE}/search`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.page).toBe('1');
	});

	it('POST /echo - JSON body echo', async () => {
		const payload = { hello: 'world', num: 123 };
		const res = await fetch(`${BASE}/echo`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.echo).toEqual(payload);
	});

	it('POST /form - form data input', async () => {
		const form = new FormData();
		form.set('name', 'Angga');
		form.set('age', '25');
		const res = await fetch(`${BASE}/form`, {
			method: 'POST',
			body: form,
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.name).toBe('Angga');
		expect(body.age).toBe('25');
	});

	it('POST /upload - file upload', async () => {
		const form = new FormData();
		const file = new File(['hello file content'], 'readme.txt', { type: 'text/plain' });
		form.set('document', file);
		const res = await fetch(`${BASE}/upload`, {
			method: 'POST',
			body: form,
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.fileInfo).not.toBeNull();
		expect(body.fileInfo.filename).toBe('readme.txt');
		expect(body.fileInfo.size).toBeGreaterThan(0);
	});

	it('POST /upload - no file', async () => {
		const form = new FormData();
		const res = await fetch(`${BASE}/upload`, {
			method: 'POST',
			body: form,
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.fileInfo).toBeNull();
	});
});

// ========================= GLOBAL MIDDLEWARE =========================

describe('Global Middleware', () => {
	it('should set X-Powered-By header', async () => {
		const res = await fetch(`${BASE}/ping`);
		expect(res.headers.get('x-powered-by')).toBe('GamanJS');
	});
});

// ========================= GLOBAL EXCEPTION HANDLER =========================

describe('Global Exception Handler', () => {
	it('GET /error - returns 500 with error message', async () => {
		const res = await fetch(`${BASE}/error`);
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe(true);
		expect(body.message).toBe('Boom! Global error test');
	});
});

// ========================= PER-ROUTE MIDDLEWARE =========================

describe('Per-route Middleware', () => {
	it('GET /guarded with valid token - returns secret data', async () => {
		const res = await fetch(`${BASE}/guarded`, {
			headers: { 'Authorization': 'Bearer valid-token' },
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.secret).toBe('Top Secret Data');
		expect(body.user).toBe('admin');
	});

	it('GET /guarded without token - returns 401', async () => {
		const res = await fetch(`${BASE}/guarded`);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.message).toBe('Unauthorized');
	});
});

// ========================= PER-ROUTE EXCEPTION HANDLER =========================

describe('Per-route Exception Handler', () => {
	it('GET /risky - caught by route exception handler', async () => {
		const res = await fetch(`${BASE}/risky`);
		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.caught).toBe(true);
		expect(body.msg).toBe('Risky route failed');
	});
});

// ========================= ROUTE GROUP (v1) =========================

describe('Route Group /v1', () => {
	it('GET /v1/hello - returns v1 greeting', async () => {
		const res = await fetch(`${BASE}/v1/hello`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.msg).toBe('Hello from v1');
	});

	it('GET /v1/me with valid api key - returns user', async () => {
		const res = await fetch(`${BASE}/v1/me`, {
			headers: { 'X-API-Key': 'secret-key' },
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user).toBe('v1-user');
	});

	it('GET /v1/me without api key - caught by v1 exception', async () => {
		const res = await fetch(`${BASE}/v1/me`);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.v1Error).toBe(true);
		expect(body.msg).toBe('Not authenticated');
	});

	it('POST /v1/data - echoes JSON through v1 group', async () => {
		const payload = { key: 'value' };
		const res = await fetch(`${BASE}/v1/data`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.v1).toBe(true);
		expect(body.data).toEqual(payload);
	});
});

// ========================= 404 =========================

describe('404 Not Found', () => {
	it('GET /nonexistent - returns 404', async () => {
		const res = await fetch(`${BASE}/this-route-does-not-exist`);
		expect(res.status).toBe(404);
	});
});
