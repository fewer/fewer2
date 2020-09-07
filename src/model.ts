import pick from 'lodash/pick';
import flags from './flags';
import { QueryBuilder } from './querybuilder';
import tables from './tables';
import {
	ColumnTypes,
	INTERNAL_TYPES,
	MODEL_INSTANCE_META,
	MODEL_STATIC_META,
} from './types';
import { isAssociation, isColumn } from './utils/predicates';
import generateTableName from './utils/generateTableName';
import { ModelInstance } from './modelinstance';
import { getConnection } from './connect';
import { AssociationType } from './associations';
import { getConfig } from './config';
import { takeRight } from 'lodash';

type ModelEvent = 'save' | 'destroy';
type ModelEventHandler = () => void | Promise<void>;

type ModelStaticMeta = {
	tableName: string;
	primaryKey: string;
	columns: Set<string>;
};

type ModelInstanceMeta = {
	dirty: Set<string>;
	// TODO: Do we really need this flag, or should we instead use the existence of a primary key?
	// If we use this flag, then you couldn't manually create an entity with a known ID and then update properties without first loading it.
	// However, if we don't use this flag, then having models that manually define their own primary key get pretty weird.
	exists: boolean;
};

export class Model {
	static tableName?: string;

	private static [MODEL_STATIC_META]: ModelStaticMeta;
	private [MODEL_INSTANCE_META]: ModelInstanceMeta;

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

		// TODO: It might be more work than it's worth to keep track of the construct phase.
		// This also means that some patterns around re-using column definitions are limited (when they don't really technically need to be)
		// Instead of doing this, it might be more worthwhile to just remove this entirely, and lean more into documentation.
		flags.constructPhase = true;

		Promise.resolve().then(() => {
			const staticMeta = this.getStaticMeta();
			if (!staticMeta.primaryKey) {
				throw new Error(
					`No primary key was found for table "${staticMeta.tableName}"`,
				);
			}

			flags.constructPhase = false;
		});

		// TODO: Maybe initalize will need to be called somewhere else?
		if (!bypassInitialize && this.initialize) {
			this.initialize();
		}

		// If this is the first time this model has been initialized, we need to fill in the static metadata:
		let isDefiningStaticMeta = false;
		if (!this.getStaticMeta()) {
			isDefiningStaticMeta = true;
			this.setStaticMeta({
				primaryKey: '',
				tableName: ((this
					.constructor as unknown) as typeof Model).getTableName(),
				columns: new Set(),
			});
		}

		const staticMeta = this.getStaticMeta();

		this[MODEL_INSTANCE_META] = {
			dirty: new Set(),
			exists: false,
		};

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
							value[INTERNAL_TYPES.COLUMN_META].config
								?.primaryKey &&
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
							// TODO: We also want to capture the column definition itself in the static meta.
							staticMeta.columns.add(property);
						}

						// NOTE: The value that we put on the model is the actual value of the column, not the definition of the column.
						target[property] =
							value[INTERNAL_TYPES.COLUMN_META].value;
					}

					// TODO: Enable this.
					// if (
					// 	isAssociation(value) &&
					// 	value[INTERNAL_TYPES.ASSOCIATION_META].type ===
					// 		AssociationType.BELONGS_TO
					// ) {
					// 	// TODO: Build this by exposing a `foreignKey()` directly in the columns export.
					// 	tableColumns!.set(`${property}Id`, {
					// 		schemaConfig: {
					// 			fk: true,
					// 		},
					// 		config: value[INTERNAL_TYPES.ASSOCIATION_META],
					// 	});
					// }
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

	private setStaticMeta(staticMeta: ModelStaticMeta) {
		(this.constructor as any)[MODEL_STATIC_META] = staticMeta;
	}

	private getStaticMeta() {
		return (this.constructor as any)[MODEL_STATIC_META] as ModelStaticMeta;
	}

	/**
	 * Ensure that a model's tables have been initalized. This should only
	 * be used internally, and at some point probably should be removed.
	 */
	static async preload() {
		// This model has already been pre-loaded, so we can just happily continue:
		if (this[MODEL_STATIC_META]) {
			return;
		}

		new this(INTERNAL_TYPES.MODEL_CONSTRUCTOR, true);
		if (getConfig().synchronize) {
			// TODO: Create tables.
		}
	}

	static find<T extends typeof Model>(this: T, primaryKey: number | string) {
		return new QueryBuilder<T>({
			modelType: this,
			tableName: this.getTableName(),
			where: {
				[this[MODEL_STATIC_META].primaryKey]: primaryKey,
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
		// TODO: Rather than Object.assign() after the fact, we should pass these into the constructor directly,
		// So that we can correctly initialize the column default values.
		const instance = new this(INTERNAL_TYPES.MODEL_CONSTRUCTOR);
		Object.assign(instance, obj);
		instance[MODEL_INSTANCE_META].dirty.clear();
		return instance;
	}

	private eventListeners = new Map<ModelEvent, Set<ModelEventHandler>>();

	initialize?(): void;

	async save<T>(this: T): Promise<T> {
		// This allows us to get some sensible types.
		const that = (this as unknown) as Model;
		const instanceMeta = that[MODEL_INSTANCE_META];
		const staticMeta = that.getStaticMeta();

		await that.trigger('save');
		const connection = getConnection();

		if (instanceMeta.exists) {
			const updateObject = pick(that, [...instanceMeta.dirty]);

			await connection
				.table(staticMeta.tableName)
				.where({
					[staticMeta.primaryKey]: that[staticMeta.primaryKey],
				})
				.update(updateObject);
		} else {
			const insertObject = pick(that, [...staticMeta.columns]);

			const [id] = await connection
				.table(staticMeta.tableName)
				.insert(insertObject);

			// @ts-ignore: I promise I can do this
			that[meta.primaryKey] = id;
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
