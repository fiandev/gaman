import { promises as fsPromises } from 'node:fs';
import { composeMiddleware, type MiddlewareHandler } from 'gaman/compose';
import { join, resolve } from 'node:path';
import { detectMime } from './mime';

export interface StaticFileOptions {
  /**
   * @ID kustom mime type konten (contoh: { 'css': 'text/css' })
   * @EN custom content mime type (example: { 'css': 'text/css' })
   */
  mimes?: Record<string, string>;

  /**
   * @ID Path direktori statis (default: public/)
   * @EN Static directory path (default: public/)
   */
  publicPath?: string;

  /**
   * @ID File default jika direktori diakses (default: index.html)
   * @EN Default file if directory is accessed (default: index.html)
   */
  defaultDocument?: string;

  /**
   * @ID Rewriter path (misal: hapus /static/)
   * @EN Rewriter path (eg: delete /static/)
   *
   * @param path
   * @returns
   */
  rewriteRequestPath?: (path: string) => string;

  /**
   * @ID Menangani saat file ditemukan.
   * @EN Handles when files are found.
   *
   * @param path
   * @param ctx
   * @returns
   */
  onFound?: (path: string, ctx: any) => void | Promise<void>;

  /**
   * @ID Menangani saat file tidak ditemukan.
   * @EN Handling when file is not found.
   *
   * @param path
   * @param ctx
   * @returns
   */
  onNotFound?: (path: string, ctx: any) => void | Promise<void>;

  /**
   * @ID Header Cache-Control (default: 1 jam = 'public, max-age=3600')
   * @EN Cache-Control header (default: 1 hour = 'public, max-age=3600')
   */
  cacheControl?: string;

  /**public
   * @ID Jika `true`, fallback ke `index.html` untuk SPA.
   * @EN If `true`, return to `index.html` for SPA.
   */
  fallbackToIndexHTML?: boolean;
}

/**
 * Serve static files for your GamanJS app.
 *
 * This middleware allows you to serve static assets like images, JavaScript, CSS,
 * or even entire HTML pages from a specific folder (default: `public/`).
 *
 * It includes automatic detection for:
 * - MIME types (customizable via `mimes`)
 * - Brotli (.br) and Gzip (.gz) compression based on `Accept-Encoding`
 * - ETag generation for efficient caching (supports 304 Not Modified)
 *
 * ## Options
 * - `mimes`: Custom MIME types. You can map file extensions manually.
 * - `priority`: Determines execution order. Use `'very-high'` if you want static to run early.
 * - `defaultDocument`: Filename to serve when a directory is requested (default: `index.html`).
 * - `rewriteRequestPath`: A function to rewrite request paths (e.g., strip `/static` prefix).
 * - `onFound`: Optional callback when a static file is found and served.
 * - `onNotFound`: Optional callback when no file is found at the requested path.
 * - `cacheControl`: Customize `Cache-Control` header. Default is 1 hour.
 * - `fallbackToIndexHTML`: If true, fallback to `index.html` for unmatched routes (SPA support).
 *
 * ## Example
 * ```ts
 * StaticServe({
 *   rewriteRequestPath: (p) => p.replace(/^\/static/, ''),
 *   fallbackToIndexHTML: true,
 *   mimes: {
 *     '.webmanifest': 'application/manifest+json'
 *   }
 * })
 * ```
 */
export const StaticServe = (
  options: StaticFileOptions = {},
): MiddlewareHandler => {
  const defaultDocument = options.defaultDocument ?? 'index.html';
  const cacheControl = options.cacheControl;

  const publicDir = resolve(process.cwd(), options.publicPath || 'public');
  console.log(publicDir)

  return composeMiddleware(async (ctx, next) => {
    let reqPath = ctx.path;

    if (options.rewriteRequestPath) {
      reqPath = options.rewriteRequestPath(reqPath);
    }

    try {
      reqPath = decodeURIComponent(reqPath);
    } catch {
      return next();
    }

    const cleanPath = reqPath.replace(/^\/+/, '');
    const targetPath = resolve(publicDir, cleanPath);

    // ! Mencegah Path Traversal / LFI
    if (!targetPath.startsWith(publicDir)) {
      return next();
    }


    let filePath = targetPath;
    let isDirectory = false;

    // Cek file & fallback ke defaultDocument
    try {
      const stats = await fsPromises.stat(targetPath);
      if (stats.isDirectory()) {
        isDirectory = true;
        filePath = join(targetPath, defaultDocument);
        // Cek stat index.html
        await fsPromises.stat(filePath);
      }
    } catch {
      // File/Direktori tidak ditemukan
      if (options.fallbackToIndexHTML) {
        filePath = join(publicDir, defaultDocument);
        try {
          await fsPromises.stat(filePath); // Pastikan fallback ada
        } catch {
          return next();
        }
      } else {
        await options.onNotFound?.(targetPath, ctx);
        return next();
      }
    }

    // Pengecekan Gzip / Brotli
    const acceptEncoding = ctx.header('accept-encoding') || '';
    let encoding: 'br' | 'gzip' | null = null;
    let encodedFilePath = filePath;

    // Gunakan properties Bun.file secara langsung untuk cek eksistensi
    if (acceptEncoding.includes('br')) {
      const brFile = Bun.file(`${filePath}.br`);
      if (await brFile.exists()) {
        encoding = 'br';
        encodedFilePath = `${filePath}.br`;
      }
    } else if (acceptEncoding.includes('gzip')) {
      const gzFile = Bun.file(`${filePath}.gz`);
      if (await gzFile.exists()) {
        encoding = 'gzip';
        encodedFilePath = `${filePath}.gz`;
      }
    }

    // 4. PERFORMA: Pembuatan ETag non-blocking menggunakan Bun.file()
    const finalFile = Bun.file(encodedFilePath);
    const etag = `"${Bun.hash(`${finalFile.size}-${finalFile.lastModified}`)}"`;

    if (ctx.header('if-none-match') === etag) {
      return ctx.send().notModified();
    }

    const contentType = detectMime(filePath, options.mimes) || 'application/octet-stream';
    await options.onFound?.(encodedFilePath, ctx);

    const headers = ctx.headers;
    headers.set('Content-Type', contentType);
    if (encoding) headers.set('Content-Encoding', encoding);
    headers.set('Vary', 'Accept-Encoding');
    headers.set('ETag', etag);
    if (cacheControl) headers.set('Cache-Control', cacheControl);

    return ctx.send(finalFile).ok();
  });
}
