import { Model } from './model';
import { getConnection } from './connect';
import { ModelInstance } from './modelinstance';
import {
	ALL_FIELDS,
	ColumnTypes,
	CreateSelectionSet,
	MODEL_INSTANCE_META,
} from './types';
import { Columns } from './columns';

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
	Plucked = typeof ALL_FIELDS,
	Count = ResultCount.MANY,
	Result = Count extends ResultCount.MANY
		? ModelInstance<ModelType, Plucked>[]
		: ModelInstance<ModelType, Plucked>
> {
	constructor(private meta: QueryMeta) {}

	private promise?: Promise<Result>;

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

		return new QueryBuilder<any, any, any, any>(nextMeta);
	}

	where(
		conditions: Partial<ColumnTypes<ModelType>>,
	): QueryBuilder<ModelType, Plucked, Count> {
		return this.__next__({
			where: conditions,
		});
	}

	pluck<NewKeys extends Columns<ModelType>>(
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

	async then(
		onFulfilled: (value: Result) => void,
		onRejected?: (error: Error) => void,
	): Promise<void> {
		if (!this.promise) {
			this.promise = this.executeQuery();
		}

		return this.promise.then(
			(value) => {
				onFulfilled(value);
			},
			(error) => {
				onRejected?.(error);
			},
		);
	}

	private async executeQuery() {
		let query = getConnection(this.meta.modelType.database).knex.select();

		if (this.meta.plucked) {
			// TODO: Always load the primary key???
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

		const create = (value: any) => {
			const instance = this.meta.modelType.create(value);
			instance[MODEL_INSTANCE_META].exists = true;
			return instance as any;
		};

		const value = await query;

		if (this.meta.resultCount === ResultCount.SINGLE) {
			// TODO: What if it isn't here.
			return create(value[0]);
		} else {
			return value.map((result) => create(result));
		}
	}
}
