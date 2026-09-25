import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	API_BASE_URL,
	BUY_CREDITS_HINT,
	baseNameFromUrl,
	baseNameWithoutExtension,
	buildMultipartBody,
	extensionFromContentType,
	headerValue,
	numberOrNull,
	parseApiError,
} from './GenericFunctions';
import type { MultipartField } from './GenericFunctions';

interface RemoveBackgroundOptions {
	size?: string;
	type?: string;
	format?: string;
	background?: string;
	crop?: boolean;
	cropMargin?: string;
}

interface FullResponse {
	body: unknown;
	headers: Record<string, unknown>;
	statusCode: number;
	statusMessage?: string;
}

export class Lassocut implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'lassocut',
		name: 'lassocut',
		icon: { light: 'file:lassocut.svg', dark: 'file:lassocut.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: 'Remove image backgrounds (remove.bg API compatible)',
		description: 'Remove image backgrounds (remove.bg API compatible)',
		defaults: {
			name: 'lassocut',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// Usable by AI agents, mainly with the Image URL input
		usableAsTool: true,
		credentials: [
			{
				name: 'lassocutApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Image', value: 'image' }],
				default: 'image',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{
						name: 'Remove Background',
						value: 'removeBackground',
						description: 'Remove the background of an image',
						action: 'Remove the background of an image',
					},
				],
				default: 'removeBackground',
			},
			{
				displayName: 'Input',
				name: 'inputType',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['image'], operation: ['removeBackground'] } },
				options: [
					{
						name: 'Binary File',
						value: 'binary',
						description: 'Send an image from a binary property of the input item',
					},
					{
						name: 'Image URL',
						value: 'url',
						description: 'Let lassocut download the image from a public URL',
					},
				],
				default: 'binary',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: { resource: ['image'], operation: ['removeBackground'], inputType: ['binary'] },
				},
				hint: 'The name of the input binary field containing the image',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/photo.jpg',
				displayOptions: {
					show: { resource: ['image'], operation: ['removeBackground'], inputType: ['url'] },
				},
				description: 'Public URL of the image to process',
			},
			{
				displayName: 'Output Binary Field',
				name: 'outputBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['image'], operation: ['removeBackground'] } },
				hint: 'The name of the output binary field to put the result image in',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['image'], operation: ['removeBackground'] } },
				options: [
					{
						displayName: 'Background Colour',
						name: 'background',
						type: 'string',
						default: '',
						placeholder: 'ffffff',
						description:
							'Hex colour code (e.g. ffffff) or colour name (e.g. white). Leave empty for a transparent background.',
					},
					{
						displayName: 'Crop Margin',
						name: 'cropMargin',
						type: 'string',
						default: '',
						placeholder: '10%',
						description:
							'Margin around the cropped subject, in pixels (e.g. 30px) or percent of the subject size (e.g. 10%). Only used when "Crop to Subject" is on.',
					},
					{
						displayName: 'Crop to Subject',
						name: 'crop',
						type: 'boolean',
						default: false,
						description: 'Whether to crop off all empty regions around the subject',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'JPG', value: 'jpg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'WebP', value: 'webp' },
						],
						default: 'png',
						description: 'Format of the result image. JPG does not support transparency.',
					},
					{
						displayName: 'Size',
						name: 'size',
						type: 'options',
						options: [
							{ name: 'Auto', value: 'auto', description: 'Highest resolution available' },
							{ name: 'Full', value: 'full', description: 'Full resolution' },
							{ name: 'Preview', value: 'preview', description: 'Low resolution preview' },
						],
						default: 'full',
						description: 'Maximum output image resolution',
					},
					{
						displayName: 'Subject Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Animal', value: 'animal' },
							{ name: 'Auto', value: 'auto' },
							{ name: 'Car', value: 'car' },
							{ name: 'Graphic', value: 'graphic' },
							{ name: 'Person', value: 'person' },
							{ name: 'Product', value: 'product' },
						],
						default: 'auto',
						description: 'Type of the foreground subject',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				if (resource !== 'image' || operation !== 'removeBackground') {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const inputType = this.getNodeParameter('inputType', i) as string;
				const outputBinaryPropertyName = this.getNodeParameter(
					'outputBinaryPropertyName',
					i,
				) as string;
				const options = this.getNodeParameter('options', i, {}) as RemoveBackgroundOptions;

				const fields: MultipartField[] = [];
				let baseName = 'image';

				if (inputType === 'url') {
					const imageUrl = (this.getNodeParameter('imageUrl', i) as string).trim();
					if (!imageUrl) {
						throw new NodeOperationError(this.getNode(), 'Image URL is empty', { itemIndex: i });
					}
					fields.push({ name: 'image_url', value: imageUrl });
					baseName = baseNameFromUrl(imageUrl);
				} else {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					baseName = baseNameWithoutExtension(binaryData.fileName);
					fields.push({
						name: 'image_file',
						value: buffer,
						fileName: binaryData.fileName ?? `${baseName}.${binaryData.fileExtension ?? 'jpg'}`,
						contentType: binaryData.mimeType,
					});
				}

				if (options.size) fields.push({ name: 'size', value: options.size });
				if (options.type) fields.push({ name: 'type', value: options.type });
				if (options.format) fields.push({ name: 'format', value: options.format });
				if (options.background && options.background.trim() !== '') {
					fields.push({ name: 'bg_color', value: options.background.trim().replace(/^#/, '') });
				}
				if (options.crop !== undefined) {
					fields.push({ name: 'crop', value: options.crop ? 'true' : 'false' });
				}
				if (options.cropMargin && options.cropMargin.trim() !== '') {
					fields.push({ name: 'crop_margin', value: options.cropMargin.trim() });
				}

				const boundary = `----n8nLassocut${Date.now().toString(16)}${Math.random()
					.toString(16)
					.slice(2)}`;
				const multipart = buildMultipartBody(fields, boundary);

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${API_BASE_URL}/removebg`,
					headers: {
						'Content-Type': multipart.contentType,
						// the API answers JSON (base64 image) whenever application/json is accepted; errors are JSON anyway
						Accept: 'image/*',
					},
					body: multipart.body,
					encoding: 'arraybuffer',
					json: false,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'lassocutApi',
					requestOptions,
				)) as FullResponse;

				const statusCode = response.statusCode;
				if (statusCode < 200 || statusCode >= 300) {
					const parsed = parseApiError(response.body);
					let message = parsed.title ?? `lassocut API request failed with status ${statusCode}`;
					if (statusCode === 402) {
						message = `${message}. ${BUY_CREDITS_HINT}`;
					}
					const errorObject: JsonObject =
						parsed.raw && typeof parsed.raw === 'object'
							? (parsed.raw as JsonObject)
							: { message, statusCode };
					throw new NodeApiError(this.getNode(), errorObject, {
						message,
						description: parsed.code ? `Error code: ${parsed.code}` : undefined,
						httpCode: String(statusCode),
						itemIndex: i,
					});
				}

				const body = response.body;
				const resultBuffer = Buffer.isBuffer(body)
					? body
					: Buffer.from(body as ArrayBuffer);
				const contentType =
					headerValue(response.headers, 'content-type')?.split(';')[0].trim() ?? 'image/png';
				const extension = extensionFromContentType(contentType, options.format ?? 'png');

				const binary = await this.helpers.prepareBinaryData(
					resultBuffer,
					`${baseName}-removebg.${extension}`,
					contentType,
				);

				const json: IDataObject = {
					credits_charged: numberOrNull(headerValue(response.headers, 'x-credits-charged')),
					width: numberOrNull(headerValue(response.headers, 'x-width')),
					height: numberOrNull(headerValue(response.headers, 'x-height')),
					detected_type: headerValue(response.headers, 'x-type') ?? null,
				};

				returnData.push({
					json,
					binary: { [outputBinaryPropertyName]: binary },
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Errors built above are already typed; anything else is a
				// transport-level failure (network, DNS, timeout)
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
				throw nodeError;
			}
		}

		return [returnData];
	}
}
