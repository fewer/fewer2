import pick from 'lodash/pick';
import { QueryBuilder } from './querybuilder';
import {
	ASSOCIATION_META,
	ColumnTypes,
	COLUMN_META,
	MODEL_INSTANCE_META,
	MODEL_STATIC_META,
} from './types';
import { isAssociation, isColumn } from './utils/predicates';
import generateTableName from './utils/generateTableName';
import { ModelInstance } from './modelinstance';
import { getConnection } from './connect';
import { AssociationType } from './associations';
import { ColumnMeta, Columns, foreignKey } from './columns';
import { buildTableForModel } from './tables/buildTable';
import { Database } from './database';

type ModelEvent = 'save' | 'destroy';
type ModelEventHandler = () => void | Promise<void>;

type ModelStaticMeta = {
	tableName: string;
	primaryKey: string;
	columns: Set<string>;
	columnDefinitions: Map<string, ColumnMeta>;
};

type ModelInstanceMeta = {
	dirty: Set<string>;
	// TODO: Do we really need this flag, or should we instead use the existence of a primary key?
	// If we use this flag, then you couldn't manually create an entity with a known ID and then update properties without first loading it.
	// However, if we don't use this flag, then having models that manually define their own primary key get pretty weird.
	exists: boolean;
};

export const models = new Set<typeof Model>();

export function getStaticMeta(
	instanceOrClass: Model | typeof Model,
): ModelStaticMeta {
	if (instanceOrClass instanceof Model) {
		return (instanceOrClass.constructor as typeof Model)[MODEL_STATIC_META];
	}
	return instanceOrClass[MODEL_STATIC_META];
}

function setStaticMeta(instance: Model, meta: ModelStaticMeta) {
	return ((instance.constructor as typeof Model)[MODEL_STATIC_META] = meta);
}

export class Model {
	static tableName?: string;
	static database?: Database;

	private static [MODEL_STATIC_META]: ModelStaticMeta;
	private [MODEL_INSTANCE_META]: ModelInstanceMeta;

	static for(database: Database) {
		return class ModelForDatabase extends Model {
			static database = database;
		};
	}

	constructor(initialValues: object = {}) {
		Promise.resolve().then(() => {
			const staticMeta = getStaticMeta(this);
			if (!staticMeta.primaryKey) {
				throw new Error(
					`No primary key was found for table "${staticMeta.tableName}"`,
				);
			}
		});

		// If this is the first time this model has been initialized, we need to fill in the static metadata:
		let isDefiningStaticMeta = false;
		if (!getStaticMeta(this)) {
			models.add(this.constructor as any);
			isDefiningStaticMeta = true;
			setStaticMeta(this, {
				primaryKey: '',
				tableName:
					(this.constructor as typeof Model).tableName ??
					generateTableName(this.constructor.name),
				columns: new Set(),
				columnDefinitions: new Map(),
			});
		}

		const staticMeta = getStaticMeta(this);

		this[MODEL_INSTANCE_META] = {
			dirty: new Set(),
			exists: false,
		};

		// Assign in the initial values:
		Object.assign(this, initialValues);

		return new Proxy<any>(this, {
			set: (target, property, value) => {
				if (isAssociation(value) || isColumn(value)) {
					if (typeof property !== 'string') {
						throw new Error(
							'Columns may only be defined for string properties.',
						);
					}

					if (property in Model.prototype) {
						throw new Error(
							`The key "${property}" is reserved by fewer, and may not be used as a column name.`,
						);
					}

					if (isColumn(value)) {
						if (
							value[COLUMN_META].config?.primaryKey &&
							isDefiningStaticMeta
						) {
							if (staticMeta.primaryKey) {
								throw new Error(
									'You cannot define multiple primary keys.',
								);
							}
							staticMeta.primaryKey = property;
						}

						if (isDefiningStaticMeta) {
							staticMeta.columns.add(property);
							staticMeta.columnDefinitions.set(
								property,
								value[COLUMN_META],
							);
						}

						// If the value is already in the instance, then we can use that directly.
						if (property in this) {
							target[property] = this[property];
						} else {
							// TODO: Allow columns to define defaults.
							target[property] = undefined;
						}
					}

					if (
						isAssociation(value) &&
						value[ASSOCIATION_META].type ===
							AssociationType.BELONGS_TO
					) {
						const columnName = `${property}Id`;

						if (!staticMeta.columnDefinitions.has(columnName)) {
							staticMeta.columnDefinitions.set(
								`${property}Id`,
								foreignKey(value[ASSOCIATION_META]),
							);
						}
					}
				} else {
					if (staticMeta.columns.has(property as string)) {
						this[MODEL_INSTANCE_META].dirty.add(property as string);
					}
					target[property] = value;
				}

				return true;
			},
		});
	}

	/**
	 * Ensure that a model's tables have been initalized. This should only
	 * be used internally, and at some point probably should be removed.
	 * TODO: This should at some point be magically called internally whenever we try
	 * to do some operation on the model.
	 */
	static async preload() {
		// This model has already been pre-loaded, so we can just happily continue:
		if (this[MODEL_STATIC_META]) {
			return;
		}

		new this({});

		if (getConnection(this.database).database.config.synchronize) {
			await buildTableForModel(this);
		}
	}

	static find<T extends typeof Model>(this: T, primaryKey: number | string) {
		return new QueryBuilder<T>({
			modelType: this,
			where: {
				[this[MODEL_STATIC_META].primaryKey]: primaryKey,
			},
		}).first();
	}

	static where<T extends typeof Model>(
		this: T,
		conditions: Partial<Columns<T>>,
	) {
		return new QueryBuilder<T>({
			modelType: this,
		});
	}

	static create<T extends typeof Model, U extends Partial<ColumnTypes<T>>>(
		this: T,
		obj: U,
	): U & ModelInstance<T> {
		return new this(obj);
	}

	private eventListeners = new Map<ModelEvent, Set<ModelEventHandler>>();

	async save<T>(this: T): Promise<T> {
		// This allows us to get some sensible types.
		const that = (this as unknown) as Model;
		const instanceMeta = that[MODEL_INSTANCE_META];
		const staticMeta = getStaticMeta(that);

		await that.trigger('save');
		const { knex } = getConnection(
			(that.constructor as typeof Model).database,
		);

		if (instanceMeta.exists) {
			const updateObject = pick(that, [...instanceMeta.dirty]);

			await knex
				.table(staticMeta.tableName)
				.where({
					[staticMeta.primaryKey]: that[staticMeta.primaryKey],
				})
				.update(updateObject);
		} else {
			const insertObject = pick(that, [...staticMeta.columns]);

			const [id] = await knex
				.table(staticMeta.tableName)
				.insert(insertObject);

			// @ts-ignore: I promise I can do this
			that[staticMeta.primaryKey] = id;
			instanceMeta.exists = true;
		}

		// The model is no longer dirty:
		instanceMeta.dirty.clear();

		return this;
	}

	on(eventName: ModelEvent, eventHandler: ModelEventHandler) {
		if (!this.eventListeners.has(eventName)) {
			this.eventListeners.set(eventName, new Set());
		}

		return this.eventListeners.get(eventName)?.add(eventHandler);
	}

	off(eventName: ModelEvent, eventHandler?: ModelEventHandler) {
		if (!eventHandler) {
			this.eventListeners.delete(eventName);
		} else {
			this.eventListeners.get(eventName)?.delete(eventHandler);
		}
	}

	async trigger(eventName: ModelEvent) {
		const eventHandlers = this.eventListeners.get(eventName);
		if (!eventHandlers) return;

		for (const eventHandler of eventHandlers) {
			await eventHandler();
		}
	}
}
