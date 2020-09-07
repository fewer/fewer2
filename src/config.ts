import { cosmiconfigSync } from 'cosmiconfig';

export type Config = {
	type: 'sqlite',
	database: string;
	synchronize?: boolean;
};

let config: Config;

// TODO: Add client-side validator for config.
export function getConfig(maybeConfig?: Config) {
	if (maybeConfig) {
		config = maybeConfig;
	}

	if (config) {
		return config;
	}

	const explorer = cosmiconfigSync('fewer');
	const result = explorer.search();
	config = result?.config;

	if (!config) {
		throw new Error('No configuration was found.');
	}

	return config;
}

