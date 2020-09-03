import { belongsTo, hasMany } from './associations';
import { connect } from './connect';
import { incrementing, int, text } from './databases/sqlite';
import { Model } from './model';
import { createTables } from './tables';

class User extends Model {
	id = incrementing({ primaryKey: true });
	name = text();
	age = int({ nullable: true });

	passwordHash = text();
	password?: string;

	posts = hasMany(Post);

	getName() {
		return this.name;
	}

	initialize() {
		this.on('save', async () => {
			if (this.password) {
				this.passwordHash = this.password.toLowerCase();
			}
		});
	}
}

class Post extends Model {
	id = incrementing({ primaryKey: true });
	title = text();
	body = text();
	user = belongsTo(User);
}

async function main() {
	await connect({
		type: 'sqlite',
		database: ':memory:',
	});

	User.preload();
	Post.preload();

	await createTables();

	await User.create({
		name: 'jordan',
	}).save();

	const mewtru = await User.create({
		name: 'mewtru',
	}).save();

	console.log(mewtru);

	const u = await User.find(mewtru.id!).pluck('id', 'name');
	console.log(u);
	console.log(u.getName());
	// const user = await User.pluck('age');
	// user.save();
	// const u = await User.where({});
	// const data = await User.where({ name: "jordan" });
}

main();
