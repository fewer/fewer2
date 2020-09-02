import { belongsTo, hasMany } from "./associations";
import { Model, string, number } from "./index";
import tables from "./tables";

class User extends Model {
  id = number({ primaryKey: true });
  name = string();
  age = number({ nullable: true });

  passwordHash = string();
  password?: string;

  posts = hasMany(Post);

  getName() {
    console.log(this.name.get());
  }

  initialize() {
    this.on("save", async () => {
      if (this.password) {
        this.passwordHash.set(this.password.toLowerCase());
      }
    });
  }
}

class Post extends Model {
  id = number({ primaryKey: true });
  title = string();
  body = string();
  user = belongsTo(User);
}

async function main() {
  const user = User.create({
    name: 'jordan'
  });

  console.log(user);
  console.log(await user.save());
  // const user = await User.pluck('age');
  // user.save();
  // const u = await User.where({});
  // const data = await User.where({ name: "jordan" });
}

main();
