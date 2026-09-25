export const API_BASE_URL = 'https://api.lassocut.com/v1.0';

export const BUY_CREDITS_HINT = 'Buy credits at https://www.lassocut.com/account/';

export interface MultipartField {
	name: string;
	value: string | Buffer;
	fileName?: string;
	contentType?: string;
}

export interface MultipartBody {
	body: Buffer;
	contentType: string;
}

/**
 * Builds a multipart/form-data body without any runtime dependency.
 */
export function buildMultipartBody(fields: MultipartField[], boundary: string): MultipartBody {
	const chunks: Buffer[] = [];
	for (const field of fields) {
		let header = `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"`;
		if (field.fileName !== undefined) {
			const safeName = field.fileName.replace(/["\r\n]/g, '_');
			header += `; filename="${safeName}"\r\nContent-Type: ${field.contentType ?? 'application/octet-stream'}`;
		}
		header += '\r\n\r\n';
		chunks.push(Buffer.from(header, 'utf8'));
		chunks.push(typeof field.value === 'string' ? Buffer.from(field.value, 'utf8') : field.value);
		chunks.push(Buffer.from('\r\n', 'utf8'));
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
	return {
		body: Buffer.concat(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}

export function extensionFromContentType(contentType: string | undefined, fallback: string): string {
	const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
	if (type === 'image/png') return 'png';
	if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
	if (type === 'image/webp') return 'webp';
	return fallback;
}

export function baseNameWithoutExtension(fileName: string | undefined): string {
	if (!fileName) return 'image';
	const last = fileName.split(/[\\/]/).pop() ?? fileName;
	const dot = last.lastIndexOf('.');
	const base = dot > 0 ? last.slice(0, dot) : last;
	return base || 'image';
}

export function baseNameFromUrl(url: string): string {
	const path = url.split(/[?#]/)[0];
	return baseNameWithoutExtension(path.split('/').pop());
}

/**
 * Extracts the first error title from a lassocut / remove.bg style error body:
 * `{"errors":[{"code":"...","title":"..."}]}`
 */
export function parseApiError(body: unknown): { title?: string; code?: string; raw?: unknown } {
	let data: unknown = body;
	if (Buffer.isBuffer(data)) {
		data = data.toString('utf8');
	}
	if (typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch {
			return { raw: data };
		}
	}
	if (data && typeof data === 'object') {
		const errors = (data as { errors?: Array<{ title?: unknown; code?: unknown }> }).errors;
		if (Array.isArray(errors) && errors.length > 0) {
			const first = errors[0];
			return {
				title: typeof first.title === 'string' ? first.title : undefined,
				code: typeof first.code === 'string' ? first.code : undefined,
				raw: data,
			};
		}
	}
	return { raw: data };
}

export function headerValue(
	headers: Record<string, unknown> | undefined,
	name: string,
): string | undefined {
	if (!headers) return undefined;
	const wanted = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === wanted) {
			if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
			return value === undefined || value === null ? undefined : String(value);
		}
	}
	return undefined;
}

export function numberOrNull(value: string | undefined): number | null {
	if (value === undefined || value.trim() === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
