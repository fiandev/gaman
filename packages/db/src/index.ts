import { col } from './blueprint';
import { Model } from './model';
import { composeSchema } from './schema';

const UserSchema = composeSchema('user', {
	id: col.id(),
	name: col.string(),
});

export const User = new Model(UserSchema);
// await User.sync();
// User.getRawKysely()
// await User.create({
//   name: 'yoga'
// })
const user = await User.all();
console.log(user)