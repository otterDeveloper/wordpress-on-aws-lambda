import { StackContext, Api, Function } from "sst/constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
	Function as CDKFunction,
	Runtime,
	Code,
	LayerVersion,
} from "aws-cdk-lib/aws-lambda";
import * as efs from "aws-cdk-lib/aws-efs";
import { FileSystem } from "aws-cdk-lib";
import { IpAddresses } from "aws-cdk-lib/aws-ec2";
export function WordpressRuntimeStack({ stack }: StackContext) {
	//use 8.2 layer
	const phpLayer = LayerVersion.fromLayerVersionArn(
		stack,
		"phpLayer",
		"arn:aws:lambda:us-east-1:209497400698:layer:php-82:27",
	);

	//TODO: receive vpc id from env variable
	const vpcStack = new ec2.Vpc(stack, "the-vpc", {
		ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
		maxAzs: 2,
		subnetConfiguration: [
			{
				cidrMask: 24,
				name: "Public",
				subnetType: ec2.SubnetType.PUBLIC,
			},
			{
				cidrMask: 24,
				name: "Private",
				subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
			},
		],
	});
	const dataEfs = new efs.FileSystem(stack, "wordpressEfs", {
		vpc: vpcStack,
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
		code: Code.fromAsset("packages/php.zip"),
		memorySize: 2048,
		handler: "handler.php",
		layers: [phpLayer],
		filesystem: fileSystemOptions,
		vpc: vpcStack,
	});

	const wordpressInstallFunction = new Function(
		stack,
		"wordpressInstallFunction",
		{
			runtime: "nodejs18.x",
			memorySize: "1 GB",
			filesystem: fileSystemOptions,
			handler: "packages/functions/src/install.handler",
			vpc: vpcStack,
		},
	);
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
		InstallFunctionName: wordpressInstallFunction.functionName,
	});
}
