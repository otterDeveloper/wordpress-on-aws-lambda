import { StackContext, Api } from "sst/constructs";
import {
	Function as CDKFunction,
	Runtime,
	Code,
	LayerVersion,
} from "aws-cdk-lib/aws-lambda";
export function WordpressRuntimeStack({ stack }: StackContext) {
	//use 8.2 layer
	const phpLayer = LayerVersion.fromLayerVersionArn(
		stack,
		"phpLayer",
		"arn:aws:lambda:us-east-1:209497400698:layer:php-82:27",
	);

	const wordpressFunction = new CDKFunction(stack, "wordpressFunction", {
		runtime: Runtime.PROVIDED_AL2,
		code: Code.fromAsset("pakages/php"),
		handler: "handler.php",
		layers: [phpLayer],
	});

	const api = new Api(stack, "api", {
		routes: {
			$default: {
				cdk: {
					function: wordpressFunction,
				},
			},
		},
	});
	stack.addOutputs({
		ApiEndpoint: api.url,
	});
}
