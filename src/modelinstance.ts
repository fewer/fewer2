import { Model } from './model';
import { ColumnTypes, INTERNAL_TYPES, NonColumnTypes, Subset } from './types';
import { isColumn } from './utils/predicates';

export type ModelInstance<
	T extends typeof Model,
	Plucked = INTERNAL_TYPES['ALL_FIELDS']
> = Subset<ColumnTypes<T>, Plucked> & NonColumnTypes<T>;

export function createModelInstance<
	T extends typeof Model,
	Plucked = INTERNAL_TYPES['ALL_FIELDS']
>(ModelType: T, obj: Partial<InstanceType<T>>): ModelInstance<T, Plucked> {
	const instance = new ModelType(INTERNAL_TYPES.MODEL_CONSTRUCTOR);

	const boundFunctions = new Map();

	const modelInstance = new Proxy(instance as any, {
		get(target, property) {
			const field = target[property];

			if (isColumn(field)) {
				return field.get();
			}

			if (typeof field === 'function') {
				if (boundFunctions.has(field)) {
					return boundFunctions.get(field);
				} else {
					const boundFunction = field.bind(instance);
					boundFunctions.set(field, instance);
					return boundFunction;
				}
			}

			return field;
		},
		set(target, property, value) {
			const field = target[property];

			if (isColumn(field)) {
				return field.set(value);
			}

			return target[property] = value;
		}
	});

	Object.assign(modelInstance, obj);

	return modelInstance;
}
