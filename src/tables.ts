import { ColumnBuilder } from 'knex';
import { ColumnMeta } from './columns';
import { getConnection } from './connect';

// TODO: Rather than doing this, just keep track of the Model classes, and stash all of the info
// in a static that we configure when we do Model.preload();
// This would basically let us split the metadata between static and non-static.
//   - Static would be columns, primaryKey
//   - Non-static  would be
const tables = new Map<string, Map<string, ColumnMeta>>();

function getPrimaryKey(tableName: string) {
	const table = tables.get(tableName);
	for (const [columnName, columnDescription] of table) {
		if (columnDescription.config?.primaryKey) {
			return columnName;
		}
	}
}

export async function createTables() {
	const connection = getConnection();

	for (const [tableName, tableDescription] of tables) {
		await connection.schema.createTable(tableName, (table) => {
			for (const [columnName, columnDescription] of tableDescription) {
				let column: ColumnBuilder;
				if (columnDescription.schemaConfig.fk) {
					// TODO: The foreign keys aren't always integers/
					// Instead, we need to mirror the type of the primary key.
					column = table.integer(columnName).unsigned();
					table
						.foreign(columnName)
						.references(
							getPrimaryKey(
								columnDescription.config.model.getTableName(),
							),
						)
						.inTable(columnDescription.config.model.getTableName());
				} else if (columnDescription.schemaConfig.columnBuilder) {
					column = columnDescription.schemaConfig.columnBuilder(
						columnName,
						columnDescription.config,
						table,
					);
				} else {
					column = table[columnDescription.schemaConfig.columnType!](
						columnName,
					);
				}

				if (column) {
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
			}
		});
	}
}

export default tables;
