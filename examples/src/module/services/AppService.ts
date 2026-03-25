import { composeService } from '../../../../src/compose';

export default composeService(() => ({
	WelcomeMessage() {
		return '❤️ Welcome to GamanJS';
	},
	GetUser(id: string) {
		return { id, name: `User ${id}`, email: `user${id}@gaman.dev` };
	},
	CreateItem(data: any) {
		return { ...data, id: Date.now(), created: true };
	},
}));
