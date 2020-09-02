import { AssociationType } from './associations';
import flags from './flags';
import { QueryBuilder } from './querybuilder';
import tables from './tables';
import { ColumnTypes, INTERNAL_TYPES } from './types';
import { isAssociation, isColumn } from './utils/predicates';
import generateTableName from './utils/generateTableName';
import { createModelInstance, ModelInstance } from './modelinstance';

type ModelEvent = 'save' | 'destroy';
type ModelEventHandler = () => void | Promise<void>;

export class Model {
	constructor(
		please_use_create_to_construct_entities: typeof INTERNAL_TYPES.MODEL_CONSTRUCTOR,
	) {
		if (
			please_use_create_to_construct_entities !==
			INTERNAL_TYPES.MODEL_CONSTRUCTOR
		) {
			throw new Error(
				'Please do not create models with the new keyword directly. Instead, use Model.create().',
			);
		}

		flags.constructPhase = true;
		Promise.resolve().then(() => {
			flags.constructPhase = false;
		});

		// TODO: Maybe initalize will need to be called somewhere else?
		if (this.initialize) {
			this.initialize();
		}

		const TABLE_NAME =
			(this.constructor as any).tableName ??
			generateTableName(this.constructor.name);

		let tableColumns = tables.get(TABLE_NAME);
		if (!tableColumns) {
			tableColumns = new Map();
			tables.set(TABLE_NAME, tableColumns);
		}

		// TODO: Investigate if we need a getPrototypeOf trap to make instanceof work
		return new Proxy(this, {
			set: (target, property, value) => {
				if (isAssociation(value) || isColumn(value)) {
					if (typeof property !== 'string') {
						throw new Error(
							'Columns may only be defined for string properties.',
						);
					}

					if (property in target) {
						throw new Error(
							`The key "${property}" is reserved by fewer, and may not be used as a column name.`,
						);
					}

					if (isColumn(value)) {
						tableColumns!.set(property, value);
					}

					if (
						isAssociation(value) &&
						value[INTERNAL_TYPES.ASSOCIATION_META].type ===
							AssociationType.BELONGS_TO
					) {
						tableColumns!.set(`${property}Id`, value);
					}
				}

				// @ts-ignore: Proxies are hard to type.
				return (target[property] = value);
			},
		});
	}

	static find<T extends typeof Model>(
		this: T,
		primaryKey: number | string,
	): QueryBuilder<T> {
		return {} as any;
	}

	static where<T extends typeof Model>(
		this: T,
		conditions: Partial<ColumnTypes<T>>,
	): QueryBuilder<T> {
		return {} as any;
	}

	static create<T extends typeof Model>(
		this: T,
		obj: Partial<ColumnTypes<T>>,
	): ModelInstance<T> {
		return createModelInstance(this, obj);
	}

	private eventListeners = new Map<ModelEvent, Set<ModelEventHandler>>();

	initialize?(): void;

	async save() {
		await this.trigger('save');
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
