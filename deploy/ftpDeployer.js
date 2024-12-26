const ftp = require('ftp');
const fs = require('fs');

class FTPDeployer {
	constructor() {
		this.client = new ftp();
	}

	async deploy(content, remotePath) {
		try {
			await this.connect();
			await this.upload(content, remotePath);
			console.log(`Successfully deployed to ${remotePath} via FTP`);
		} catch (err) {
			console.error('FTP deployment error:', err);
			throw err; // Re-throw the error to be handled by the caller
		} finally {
			this.close();
		}
	}

	async connect() {
		return new Promise((resolve, reject) => {
			this.client.on('ready', resolve);
			this.client.on('error', reject);

			this.client.connect({
				host: process.env.FTP_HOST,
				user: process.env.FTP_USER,
				password: process.env.FTP_PASSWORD,
			});
		});
	}

	async upload(content, remotePath) {
		return new Promise((resolve, reject) => {
			const stream = require('stream');
			const contentStream = new stream.PassThrough();
			contentStream.end(content);

			this.client.put(contentStream, remotePath, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	close() {
		this.client.end();
	}
}

module.exports = FTPDeployer;