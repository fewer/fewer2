import { cosmiconfig } from 'cosmiconfig';

export type Config = {
	type: 'sqlite',
	database: string;
};

let config: Config;

export function setConfig(newConfig: Config) {
	config = newConfig;
}

export async function loadConfig() {
	if (config) {
		return config;
	}

	const explorer = cosmiconfig('fewer');
	const result = await explorer.search();
	config = result?.config;
	return config;
}

