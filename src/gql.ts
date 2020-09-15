import { ApolloServer } from 'apollo-server';
import 'reflect-metadata';
import {
	buildSchema,
	Field,
	Int,
	ObjectType,
	Query,
	Resolver,
} from 'type-graphql';
import { Model } from './';
import { connect } from './connect';
import { incrementing, text } from './databases/sqlite';

@ObjectType()
class User extends Model {
	@Field(() => Int)
	id = incrementing({ primaryKey: true });

	@Field(() => String)
	name = text();
}

@Resolver()
class UserResolver {
	@Query(() => User)
	me() {
		return User.create({ id: 1, name: 'jordan' });
	}
}

async function main() {
	const schema = await buildSchema({
		resolvers: [UserResolver],
		emitSchemaFile: true,
	});

	await connect({
		type: 'sqlite',
		database: ':memory:',
		synchronize: true
	});
	await User.preload();

	new ApolloServer({
		schema,
	}).listen(8000, () => {
		console.log('BOOTED');
	});
}

main();
