import { Model } from './model';
import { getConnection } from './connect';
import { createModelInstance, ModelInstance } from './modelinstance';
import { ColumnTypes, CreateSelectionSet, INTERNAL_TYPES } from './types';

enum ResultCount {
	MANY = 'MANY',
	SINGLE = 'SINGLE',
}

type QueryMeta = {
	modelType: typeof Model;
	tableName: string;
	where?: any;
	plucked?: string[];
	limit?: number;
	offset?: number;
	resultCount?: ResultCount;
};

export class QueryBuilder<
	ModelType extends typeof Model,
	Plucked = INTERNAL_TYPES['ALL_FIELDS'],
	Count = ResultCount.MANY
> {
	constructor(private meta: QueryMeta) {}

	/**
	 * This is an internal helper that is used to construct the next QueryBuilder object.
	 */
	private __next__(partialMeta: Partial<QueryMeta>) {
		const nextMeta = {
			...this.meta,
			...partialMeta,
		};

		if (partialMeta.plucked) {
			nextMeta.plucked = [
				...(this.meta.plucked ?? []),
				...partialMeta.plucked,
			];
		}

		return new QueryBuilder<any, any, any>(nextMeta);
	}

	where(
		conditions: Partial<ColumnTypes<ModelType>>,
	): QueryBuilder<ModelType, Plucked, Count> {
		return this.__next__({
			where: conditions,
		});
	}

	pluck<NewKeys extends keyof ColumnTypes<ModelType>>(
		...keys: NewKeys[]
	): QueryBuilder<ModelType, CreateSelectionSet<Plucked, NewKeys>, Count> {
		return this.__next__({
			plucked: keys as string[],
		});
	}

	limit(limit: number): QueryBuilder<ModelType, Plucked, Count> {
		return this.__next__({
			limit,
		});
	}

	offset(offset: number): QueryBuilder<ModelType, Plucked, Count> {
		return this.__next__({
			offset,
		});
	}

	first(): QueryBuilder<ModelType, Plucked, ResultCount.SINGLE> {
		return this.__next__({
			limit: 1,
			resultCount: ResultCount.SINGLE,
		});
	}

	// TODO: Cache the promise so that multiple calls on this instance will return the same promise.
	async then(
		onFulfilled: (
			value: Count extends ResultCount.MANY
				? ModelInstance<ModelType, Plucked>[]
				: ModelInstance<ModelType, Plucked>,
		) => void,
		onRejected?: (error: Error) => void,
	): Promise<void> {
		let query = getConnection().select();

		if (this.meta.plucked) {
			// TODO: Always load the primary key.
			query = query.select(...this.meta.plucked);
		}

		query = query.from(this.meta.tableName);

		if (this.meta.where) {
			query = query.where(this.meta.where);
		}

		if (this.meta.limit) {
			query = query.limit(this.meta.limit);
		}

		if (this.meta.offset) {
			query = query.offset(this.meta.offset);
		}

		return query.then(
			(value) => {
				if (this.meta.resultCount === ResultCount.SINGLE) {
					console.log(value);
					// TODO: What if it isn't here.
					onFulfilled(this.meta.modelType.create(value[0]));
				} else {
					onFulfilled(
						value.map((result) =>
							this.meta.modelType.create(result),
						),
					);
				}
			},
			(err) => {
				onRejected?.(err);
			},
		);
	}
}
