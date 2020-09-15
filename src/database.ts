import Knex from 'knex';

type BaseConfig = {
	synchronize: boolean;
};

export abstract class Database<
	Name extends string = 'unknown',
	Config extends {} = BaseConfig
> {
	config: Config & BaseConfig;

	constructor(config: Config & BaseConfig) {
		this.config = config;
	}

	abstract connect(): Promise<Knex>;
}
