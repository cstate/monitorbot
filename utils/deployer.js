import fs from 'fs';
import path from 'path';
import ftp from 'ftp';
import simpleGit from 'simple-git';
import config from '../config.js';

class Deployer {
	constructor() {
		// Determine the deployment method from config
		switch (config.deployment.method) {
			case 'ftp':
				this.deployMethod = this.ftpDeploy;
				break;
			case 'git':
				this.deployMethod = this.gitDeploy;
				break;
			case 'local':
			default:
				this.deployMethod = this.localDeploy;
				this.basePath = path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH);
		}
	}

	async deploy(content, filePath) {
		if (config.testMode) {
			console.log('--- Test Mode Deployment ---');
			console.log(`Would deploy to: ${filePath}`);
			console.log('Content:');
			console.log(content);
			console.log('--- End Test Mode Deployment ---');
			return; // Skip actual deployment in test mode
		}

		try {
			// Use the selected deployment method
			await this.deployMethod(content, filePath);
		} catch (err) {
			console.error('Deployment error:', err);
			throw err;
		}
	}

	// FTP Deployment
	async ftpDeploy(content, remotePath) {
		const client = new ftp();
		try {
			await new Promise((resolve, reject) => {
				client.on('ready', resolve);
				client.on('error', reject);
				client.connect({
					host: process.env.FTP_HOST,
					user: process.env.FTP_USER,
					password: process.env.FTP_PASSWORD,
				});
			});

			await new Promise((resolve, reject) => {
				const contentStream = new require('stream').PassThrough();
				contentStream.end(content);
				client.put(contentStream, remotePath, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			console.log(`Successfully deployed to ${remotePath} via FTP`);
		} catch (err) {
			console.error('FTP deployment error:', err);
			throw err;
		} finally {
			client.end();
		}
	}

	// Git Deployment
	async gitDeploy(content, filePath) {
		const git = simpleGit(path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH));
		try {
			const fullPath = path.join(
				process.cwd(),
				process.env.LOCAL_CSTATE_PATH,
				filePath
			);
			fs.writeFileSync(fullPath, content); // Write content to the Git working directory
			await git.add(fullPath);
			await git.commit('Automated incident update');
			await git.push(process.env.GIT_REMOTE, process.env.GIT_BRANCH);
			console.log(`Successfully deployed via Git to ${process.env.GIT_REMOTE}`);
		} catch (err) {
			console.error('Git deployment error:', err);
			throw err;
		}
	}

	// Local Deployment
	async localDeploy(content, filePath) {
		try {
			const fullPath = path.join(this.basePath, filePath);
			const dirName = path.dirname(fullPath);

			// Ensure the directory exists
			if (!fs.existsSync(dirName)) {
				fs.mkdirSync(dirName, { recursive: true });
			}

			fs.writeFileSync(fullPath, content);
			console.log(`Successfully deployed to ${fullPath} locally`);
		} catch (err) {
			console.error('Local deployment error:', err);
			throw err;
		}
	}
}

export default Deployer;