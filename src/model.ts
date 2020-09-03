import flags from './flags';
import { QueryBuilder } from './querybuilder';
import tables from './tables';
import { ColumnTypes, INTERNAL_TYPES } from './types';
import { isAssociation, isColumn } from './utils/predicates';
import generateTableName from './utils/generateTableName';
import { ModelInstance } from './modelinstance';
import { getConnection } from './connect';

type ModelEvent = 'save' | 'destroy';
type ModelEventHandler = () => void | Promise<void>;

export class Model {
	static tableName?: string;
	[INTERNAL_TYPES.MODEL_META]: {
		tableName: string;
		primaryKey: string;
		columns: Set<string>;
	};

	static getTableName() {
		return this.tableName ?? generateTableName(this.name);
	}

	constructor(
		please_use_create_to_construct_entities: typeof INTERNAL_TYPES.MODEL_CONSTRUCTOR,
		bypassInitialize: boolean = false,
	) {
		if (
			please_use_create_to_construct_entities !==
			INTERNAL_TYPES.MODEL_CONSTRUCTOR
		) {
			throw new Error(
				'Model instances cannot be created with the new keyword. Instead, use Model.create().',
			);
		}

		flags.constructPhase = true;
		Promise.resolve().then(() => {
			if (!this[INTERNAL_TYPES.MODEL_META].primaryKey) {
				throw new Error(
					`No primary key was found for table "${
						this[INTERNAL_TYPES.MODEL_META].tableName
					}"`,
				);
			}
			flags.constructPhase = false;
		});

		// TODO: Maybe initalize will need to be called somewhere else?
		if (!bypassInitialize && this.initialize) {
			this.initialize();
		}

		this[INTERNAL_TYPES.MODEL_META] = {
			primaryKey: '',
			tableName: ((this
				.constructor as unknown) as typeof Model).getTableName(),
			columns: new Set(),
		};

		let tableColumns: Map<string, any> | undefined;
		if (flags.buildTables) {
			tableColumns = tables.get(
				this[INTERNAL_TYPES.MODEL_META].tableName,
			);
			if (!tableColumns) {
				tableColumns = new Map();
				tables.set(
					this[INTERNAL_TYPES.MODEL_META].tableName,
					tableColumns,
				);
			}
		}

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
						if (flags.buildTables) {
							tableColumns!.set(
								property,
								value[INTERNAL_TYPES.COLUMN_META],
							);
						}

						if (
							value[INTERNAL_TYPES.COLUMN_META].config?.primaryKey
						) {
							if (this[INTERNAL_TYPES.MODEL_META].primaryKey) {
								throw new Error(
									'You cannot define multiple primary keys.',
								);
							}
							this[
								INTERNAL_TYPES.MODEL_META
							].primaryKey = property;
						}

						this[INTERNAL_TYPES.MODEL_META].columns.add(property);

						target[property] =
							value[INTERNAL_TYPES.COLUMN_META].value;
					}

					// TODO: Add association columns:
					// if (
					// 	isAssociation(value) &&
					// 	value[INTERNAL_TYPES.ASSOCIATION_META].type ===
					// 		AssociationType.BELONGS_TO
					// ) {
					// 	tableColumns!.set(
					// 		`${property}Id`,
					// 		value[INTERNAL_TYPES.ASSOCIATION_META],
					// 	);
					// }
				} else {
					target[property] = value;
				}

				return true;
			},
		});
	}

	/**
	 * Ensure that a model's tables have been initalized. This should only
	 * be used internally, and at some point probably should be removed.
	 */
	static preload() {
		flags.buildTables = true;
		new this(INTERNAL_TYPES.MODEL_CONSTRUCTOR, true);
		flags.buildTables = false;
	}

	static find<T extends typeof Model>(this: T, primaryKey: number | string) {
		// TODO: This is a hack. Instead what we want to do is have a method to get the model meta, which basically does what preload does,
		// but caches the result so that we can statically get the model meta.
		const modelInstance = new this(INTERNAL_TYPES.MODEL_CONSTRUCTOR, true);
		return new QueryBuilder<T>({
			modelType: this,
			tableName: this.getTableName(),
			where: {
				[modelInstance[INTERNAL_TYPES.MODEL_META]
					.primaryKey]: primaryKey,
			},
		}).first();
	}

	static where<T extends typeof Model>(
		this: T,
		conditions: Partial<ColumnTypes<T>>,
	) {
		return new QueryBuilder<T>({
			modelType: this,
			tableName: this.getTableName(),
		});
	}

	static create<T extends typeof Model>(
		this: T,
		obj: Partial<ColumnTypes<T>>,
	): ModelInstance<T> {
		const instance = new this(INTERNAL_TYPES.MODEL_CONSTRUCTOR);
		Object.assign(instance, obj);
		return instance;
	}

	private eventListeners = new Map<ModelEvent, Set<ModelEventHandler>>();

	initialize?(): void;

	async save<T>(this: T): Promise<T> {
		await this.trigger('save');
		const connection = getConnection();

		const insertObject: Record<string, any> = {};

		for (const column of this[INTERNAL_TYPES.MODEL_META].columns) {
			insertObject[column] = this[column];
		}

		const [id] = await connection
			.table(this[INTERNAL_TYPES.MODEL_META].tableName)
			.insert(insertObject);

		// @ts-ignore: I promise this is a column:s
		this[this[INTERNAL_TYPES.MODEL_META].primaryKey] = id;

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
