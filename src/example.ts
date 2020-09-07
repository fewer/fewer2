import { belongsTo, hasMany } from './associations';
import { connect } from './connect';
import { incrementing, int, text } from './databases/sqlite';
import { Model } from './model';

class User extends Model {
	id = incrementing({ primaryKey: true });
	name = text();
	age = int({ nullable: true });

	passwordHash = text();
	password?: string;

	posts = hasMany(Post);

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
		synchronize: true
	});

	// Preload the models to ensure the tables for them have been created and they are ready to be used freely.
	await Promise.all([
		Post.preload(),
		User.preload()
	]);

	await User.create({
		name: 'jordan',
	}).save();

	const mewtru = await User.create({
		name: 'mewtru',
	}).save();

	mewtru.name = 'mewtwo';

	await mewtru.save();

	console.log(mewtru);

	const u = await User.find(mewtru.id!).pluck('id', 'name');
	console.log(u);
	// const user = await User.pluck('age');
	// user.save();
	// const u = await User.where({});
	// const data = await User.where({ name: "jordan" });
}

main();
