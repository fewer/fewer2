import { ColumnBuilder } from 'knex';
import { ColumnMeta } from './columns';
import { getConnection } from './connect';

const tables = new Map<string, Map<string, ColumnMeta>>();

export async function createTables() {
	const connection = getConnection();

	for (const [tableName, tableDescription] of tables) {
		await connection.schema.createTable(tableName, (table) => {
			for (const [columnName, columnDescription] of tableDescription) {
				let column: ColumnBuilder;
				switch (columnDescription.type) {
					case 'INTEGER':
						column = table.integer(columnName);
						break;
					case 'TEXT':
						column = table.text(columnName);
						break;
					default:
						throw new Error(
							`Unknown column type "${columnDescription.type}"`,
						);
				}

				if (columnDescription.config?.primaryKey) {
					column.primary();
				}
				if (columnDescription.config?.nullable) {
					column.nullable();
				}
				if (columnDescription.config?.unique) {
					column.unique();
				}
			}
		});
	}
}

export default tables;
