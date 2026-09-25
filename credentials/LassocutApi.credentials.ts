import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LassocutApi implements ICredentialType {
	name = 'lassocutApi';

	displayName = 'Lassocut API';

	icon: Icon = {
		light: 'file:../nodes/Lassocut/lassocut.svg',
		dark: 'file:../nodes/Lassocut/lassocut.dark.svg',
	};

	documentationUrl = 'https://www.lassocut.com/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your lassocut API key, available at https://www.lassocut.com/account/',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.lassocut.com/v1.0',
			url: '/account',
			method: 'GET',
		},
	};
}
