import { SSTConfig } from "sst";
import { WordpressRuntimeStack } from "./stacks/WordpressStack";

export default {
	config(_input) {
		return {
			name: "wordpress-on-lambda",
			region: "us-east-1",
		};
	},
	stacks(app) {
		app.stack(WordpressRuntimeStack);
	},
} satisfies SSTConfig;
