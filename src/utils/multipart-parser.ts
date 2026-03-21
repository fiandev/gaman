import { isBlank, isDefined } from './validate';

export interface ParsedMultipart {
	name: string;
	isText: boolean;
	isFile: boolean;
	filename?: string;
	text?: string;
	mediaType?: string;
	content: any[];
}

export function parseMultipart(
	data: Buffer,
	boundary: string,
): ParsedMultipart[] {
	const rawData = data.toString('latin1');
	const parts = rawData.split(`--${boundary}`).slice(1, -1);

	const multipart: ParsedMultipart[] = [];

	let i = 0;
	while (i < parts.length) {
		const part = parts[i]?.trim();
		if (!isDefined(part)) continue;

		const separator = part.match(/\r?\n\r?\n/);
		if (!separator) {
			i++;
			continue;
		}

		const separatorIndex = part.indexOf(separator[0]);
		const rawHeaders = part.substring(0, separatorIndex);
		const body = part.substring(separatorIndex + separator[0].length);

		const headers = rawHeaders.split('\r\n');

		let name = '';
		let filename: string | undefined;
		let contentType: string | undefined;

		let j = 0;
		while (j < headers.length) {
			const header = headers[j];
			if (!isDefined(header)) continue;

			const [key, ...valueParts] = header.split(':');
			if (!isDefined(key)) continue;

			const lowerKey = key.trim().toLowerCase();
			const value = valueParts.join(':').trim();

			if (lowerKey === 'content-disposition') {
				const attrs = value.split(';');
				let k = 0;
				while (k < attrs.length) {
					const attr = attrs[k]?.trim();
					if (!isDefined(attr)) continue;

					const [attrKey, attrValRaw] = attr.split('=');
					const attrVal = attrValRaw?.trim().replace(/^"|"$/g, '');
					if (!isDefined(attrVal)) continue;

					if (attrKey === 'name') name = attrVal;
					if (attrKey === 'filename') filename = attrVal;
					k++;
				}
			}

			if (lowerKey === 'content-type') {
				contentType = value;
			}

			j++;
		}

		if (!isBlank(name)) {
			const binaryContent = new Uint8Array(Buffer.from(body, 'latin1'));
			if (filename) {
				multipart.push({
					name,
					isText: false,
					isFile: true,
					filename,
					mediaType: contentType ?? 'application/octet-stream',
					content: [binaryContent],
				});
			} else {
				multipart.push({
					name,
					isText: true,
					isFile: false,
					text: body,
					content: [binaryContent],
				});
			}
		}

		i++;
	}

	return multipart;
}
