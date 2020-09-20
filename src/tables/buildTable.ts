import { ColumnBuilder, TableBuilder } from 'knex';
import { ColumnMeta } from '../columns';
import { getConnection } from '../connect';
import { getStaticMeta, Model } from '../model';

function createColumn(
	table: TableBuilder,
	name: string,
	columnDescription: ColumnMeta,
	applyModifiers = true,
) {
	let column: ColumnBuilder;
	const { schemaConfig, config, association } = columnDescription;

	if (schemaConfig.fk) {
		const associationStaticMeta = getStaticMeta(
			columnDescription.association!.model,
		);
		column = createColumn(
			table,
			name,
			associationStaticMeta.columnDefinitions.get(
				associationStaticMeta.primaryKey,
			)!,
			// Don't apply the modifiers, so that the foreign key is not a primary key as well.
			false,
		);
	} else if (columnDescription.schemaConfig.columnBuilder) {
		column = columnDescription.schemaConfig.columnBuilder(
			name,
			columnDescription.config,
			table,
		);
	} else {
		// @ts-ignore: This index works:
		column = table[schemaConfig.columnType!](name);
	}

	if (applyModifiers) {
		if (config?.primaryKey) column.primary();
		if (config?.nullable) column.nullable();
		if (config?.unique) column.unique();
	}

	return column;
}

// TODO: Update the table / columns if it already exists.
export async function buildTableForModel(model: typeof Model) {
	const { knex } = getConnection(model.database);
	const staticMeta = getStaticMeta(model);

	await knex.schema.createTable(staticMeta.tableName, (table) => {
		for (const [
			columnName,
			columnDescription,
		] of staticMeta.columnDefinitions) {
			createColumn(table, columnName, columnDescription);

			if (columnDescription.schemaConfig.fk) {
				// Add the foreign key:
				table
					.foreign(columnName)
					.references(
						getStaticMeta(columnDescription.association!.model)
							.primaryKey,
					)
					.inTable(
						getStaticMeta(columnDescription.association!.model)
							.tableName,
					);
			}
		}
	});
}
