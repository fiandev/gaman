import { Logger } from 'gaman/utils';
import { registerCommand } from './registry';

const handler = async (args: string[]): Promise<void> => {
  const method = args[0]?.toUpperCase();
  const url = args[1];

  if (!method || !url) {
    Logger.error("Usage: fetch <METHOD> <URL> [-h Header] [-b Body]");
    return;
  }

  // Parsing manual untuk -h dan -b
  const headerIndex = args.indexOf("-h");
  const bodyIndex = args.indexOf("-b");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Ambil value setelah -h (Format "Key:Value")
  if (headerIndex !== -1 && args[headerIndex + 1]) {
    const headerRaw = args[headerIndex + 1];
    const splitIndex = headerRaw?.indexOf(":") || -1;
    if (splitIndex !== -1) {
      const key = headerRaw?.slice(0, splitIndex).trim() || '';
      const value = headerRaw?.slice(splitIndex + 1).trim() || '';
      headers[key] = value;
    }
  }

  // Ambil value setelah -b
  let body = null;
  if (bodyIndex !== -1 && args[bodyIndex + 1]) {
    body = args[bodyIndex + 1];
  }

  Logger.info(`Sending ${method} request to: ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? null : body,
    });

    const resText = await response.text();
    let resData;

    try {
      resData = JSON.parse(resText);
    } catch {
      resData = resText;
    }

    if (response.ok) {
      Logger.info(`Status: ${response.status}`);
      console.log(typeof resData === "object" 
        ? JSON.stringify(resData, null, 2) 
        : resData
      );
    } else {
      Logger.error(`Status: ${response.status}`);
      console.log(resData);
    }
  } catch (err: any) {
    Logger.error(`Fetch failed: ${err.message}`);
  }
};

registerCommand({
  name: 'fetch',
  description: 'Request internal/external API via CLI',
  usage: 'fetch <METHOD> <URL> [-h "Key: Value"] [-b "Body"]',
  aliases: ['req'],
  handler,
});