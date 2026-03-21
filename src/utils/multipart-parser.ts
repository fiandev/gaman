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
  boundary: string
): ParsedMultipart[] {
  const rawData = data.toString("latin1");
  const parts = rawData.split(`--${boundary}`).slice(1, -1);

  const multipart: ParsedMultipart[] = [];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i]?.trim();
    const [rawHeaders, ...rest] = part?.split("\r\n\r\n") ?? [];
    const body = rest.join("\r\n\r\n");

    const headers = rawHeaders?.split("\r\n") ?? [];

    let name = "";
    let filename: string | undefined;
    let contentType: string | undefined;

    let j = 0;
    while (j < (headers?.length ?? 0)) {
      const header = headers[j];
      const [key, ...valueParts] = header?.split(":") ?? [];
      const lowerKey = key?.trim().toLowerCase();
      const value = valueParts.join(":").trim();

      if (lowerKey === "content-disposition") {
        const attrs = value.split(";");
        let k = 0;
        while (k < attrs.length) {
          const attr = attrs[k]?.trim();
          const [attrKey, attrValRaw] = attr?.split("=") ?? [];
          const attrVal = attrValRaw?.trim().replace(/^"|"$/g, "");
          if (attrKey === "name") name = attrVal ?? "";
          if (attrKey === "filename") filename = attrVal;
          k++;headers?.length ?? 0
        }
      }

      if (lowerKey === "content-type") {
        contentType = value;
      }

      j++;
    }

		const binaryContent = new Uint8Array(Buffer.from(body, 'latin1'));
    if (filename) {
      multipart.push({
        name,
        isText: false,
        isFile: true,
        filename,
        mediaType: contentType ?? "application/octet-stream",
        content: [binaryContent],
      });
    } else {
      multipart.push({
        name,
        isText: true,
        isFile: false,
        text: body,
        content: [binaryContent]
      });
    }

    i++;
  }

  return multipart;
}
