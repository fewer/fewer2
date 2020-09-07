import { Config, getConfig } from './config';
import knex from 'knex';

let connection: knex;

export function getConnection() {
	return connection;
}

export async function connect(maybeConfig?: Config) {
	const config = await getConfig(maybeConfig);

	connection = knex({
		client: 'sqlite3',
		useNullAsDefault: true,
		connection: {
			filename: config.database,
		},
	});
}
