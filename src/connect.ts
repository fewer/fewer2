import { Config, loadConfig, setConfig } from './config';
import knex from 'knex';

let connection: knex;

export function getConnection() {
	return connection;
}

export async function connect(connectionConfig?: Config) {
	let config = connectionConfig!;
	if (!connectionConfig) {
		config = await loadConfig();
		if (!config) {
			throw new Error('No configuration was found.');
		}
	} else {
		setConfig(connectionConfig);
	}

	connection = knex({
		client: 'sqlite3',
		useNullAsDefault: true,
		connection: {
			filename: config.database,
		},
	});
}
