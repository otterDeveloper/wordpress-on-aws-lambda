import { Handler } from "aws-lambda";
import { createWriteStream } from "node:fs";
const { pipeline } = require("node:stream/promises");
import * as http from "node:http";
import AdmZip from "adm-zip";
export const handler: Handler = async (event, context) => {
	const wordpressDownloadUrl = "https://wordpress.org/latest.zip";
	const file = createWriteStream("/tmp/wordpress.zip");
	console.log("Downloading Wordpress");

	http.get(wordpressDownloadUrl, async (res) => {
		await pipeline(res, file);
		console.log("Wordpress downloaded");
		const zip = new AdmZip(file.path);
		await zip.extractAllToAsync("/mnt/root", true);
		console.log("Wordpress extracted");
	});

	return {
		statusCode: 200,
		message: "Wordpress downloaded and extracted",
	};
};
