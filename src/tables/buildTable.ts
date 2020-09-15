import { ColumnBuilder } from 'knex';
import { getConnection } from '../connect';
import { getStaticMeta, Model } from '../model';

// TODO: Update the table / columns if it already exists.
export async function buildTableForModel(model: typeof Model) {
	const { knex } = getConnection(model.database);
	const staticMeta = getStaticMeta(model);

	await knex.schema.createTable(staticMeta.tableName, (table) => {
		for (const [
			columnName,
			columnDescription,
		] of staticMeta.columnDefinitions) {
			let column: ColumnBuilder;
			if (columnDescription.schemaConfig.fk) {
				// TODO: The foreign keys aren't always integers/
				// Instead, we need to mirror the type of the primary key.
				column = table.integer(columnName).unsigned();
				table
					.foreign(columnName)
					.references(
						getStaticMeta(columnDescription.config.model)
							.primaryKey,
					)
					.inTable(
						getStaticMeta(columnDescription.config.model).tableName,
					);
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
