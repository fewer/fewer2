import knex from 'knex';
import { Database } from './database';

type Connection = {
	database: Database;
	knex: knex;
};

let connections = new Map<Database, Connection>();
let connectHasBeenCalled = false;

export function getConnection(database?: Database): Connection {
	if (connections.size > 1 && !database) {
		throw new Error(
			'You are using a multi-database project, but you did not define the database to use for a model.',
		);
	}

	if (!database) {
		return connections.get([...connections.keys()][0])!;
	}

	const connection = connections.get(database);

	if (!connection) {
		throw new Error(
			'No connection for was found. Ensure that you have called `connect` before using any models.',
		);
	}

	return connection;
}

export async function connect(...databases: Database[]) {
	if (connectHasBeenCalled) {
		throw new Error('You may only call `connect` once.');
	}

	connectHasBeenCalled = true;

	connections = new Map(
		await Promise.all(
			databases.map(
				async (database: Database) =>
					[
						database,
						{
							database,
							knex: await database.connect(),
						},
					] as const,
			),
		),
	);
}
