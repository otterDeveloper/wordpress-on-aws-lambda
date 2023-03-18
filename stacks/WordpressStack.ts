import { StackContext, Api } from "sst/constructs";
import * as vpc from "aws-cdk-lib/aws-ec2";
import {
	Function as CDKFunction,
	Runtime,
	Code,
	LayerVersion,
} from "aws-cdk-lib/aws-lambda";
import * as efs from "aws-cdk-lib/aws-efs";
import { FileSystem } from "aws-cdk-lib";
export function WordpressRuntimeStack({ stack }: StackContext) {
	//use 8.2 layer
	const phpLayer = LayerVersion.fromLayerVersionArn(
		stack,
		"phpLayer",
		"arn:aws:lambda:us-east-1:209497400698:layer:php-82:27",
	);

	//TODO: receive vpc id from env variable
	const dataEfs = new efs.FileSystem(stack, "wordpressEfs", {
		vpc: vpc.Vpc.fromLookup(stack, "vpc", { isDefault: true }),
		lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
	});

	const efsAccessPoint = new efs.AccessPoint(stack, "efsAccessPoint", {
		fileSystem: dataEfs,
		posixUser: {
			uid: "1000",
			gid: "1000",
		},
		createAcl: {
			ownerGid: "1000",
			ownerUid: "1000",
			permissions: "755",
		},
		//Could reuse the EFS with other stacks, using a different path
		path: "/wordpress",
	});

	const fileSystemOptions = {
		config: {
			arn: efsAccessPoint.accessPointArn,
			localMountPath: "/mnt/root",
		},
	} satisfies FileSystem;

	const wordpressFunction = new CDKFunction(stack, "wordpressFunction", {
		runtime: Runtime.PROVIDED_AL2,
		code: Code.fromAsset("pakages/php"),
		handler: "handler.php",
		layers: [phpLayer],
		filesystem: fileSystemOptions,
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
