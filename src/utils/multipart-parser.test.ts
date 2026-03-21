import { describe, it, expect } from 'bun:test';
import { Buffer } from 'node:buffer';
import * as fs from 'fs';
import { parseMultipart } from './multipart-parser';

// multipart.ts
type FilePart = {
	filename: string;
	contentType: string;
	content: string | Buffer;
};

type FormValue = string | FilePart;

export class MultipartForm {
	private boundary: string;
	private parts: [string, FormValue][] = [];

	constructor(boundary?: string) {
		this.boundary =
			boundary || `----MultipartBoundary${Math.random().toString(16).slice(2)}`;
	}

	public append(name: string, value: FormValue) {
		this.parts.push([name, value]);
	}

	public getBoundary(): string {
		return this.boundary;
	}

	public toString(): string {
		const lines: string[] = [];

		for (const [name, value] of this.parts) {
			lines.push(`--${this.boundary}`);

			if (typeof value === 'string') {
				lines.push(`Content-Disposition: form-data; name="${name}"`);
				lines.push('');
				lines.push(value);
			} else {
				lines.push(
					`Content-Disposition: form-data; name="${name}"; filename="${value.filename}"`,
				);
				lines.push(`Content-Type: ${value.contentType}`);
				lines.push('');
				lines.push(
					typeof value.content === 'string'
						? value.content
						: value.content.toString(),
				);
			}
		}

		lines.push(`--${this.boundary}--`);
		lines.push('');

		return lines.join('\r\n');
	}
}

const form = new MultipartForm('WebKitFormBoundaryABC123');
form.append('avatar', {
	filename: 'avatar.png',
	contentType: 'image/png',
	content: fs.readFileSync('.github/images/gaman.png'),
});

describe('Multipart Parser', () => {
	it('benchmark parser', () => {
		const input = Buffer.from(form.toString());
		const boundary = form.getBoundary();

		// const start = performance.now();
		const result = parseMultipart(input, boundary);
		// const end = performance.now();

		// console.log(`⏱️ Multipart parsed in ${(end - start).toFixed(3)} ms`);
		expect(result).toBeDefined();
	});
	it('benchmark parser', () => {
		const input = Buffer.from(form.toString());
		const boundary = form.getBoundary();

		// const start = performance.now();
		const result = parseMultipart(input, boundary);
		// const end = performance.now();

		// console.log(`⏱️ Multipart parsed in ${(end - start).toFixed(3)} ms`);
		expect(result).toBeDefined();
	});
	it('benchmark parser', () => {
		const input = Buffer.from(form.toString());
		const boundary = form.getBoundary();

		// const start = performance.now();
		const result = parseMultipart(input, boundary);
		// const end = performance.now();

		// console.log(`⏱️ Multipart parsed in ${(end - start).toFixed(3)} ms`);
		expect(result).toBeDefined();
	});
});
