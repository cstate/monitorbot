const fs = require('fs');
const path = require('path');

class LocalDeployer {
	constructor() {
		this.basePath = path.join(__dirname, '..', process.env.LOCAL_CSTATE_PATH);
	}

	async deploy(content, filePath) {
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

module.exports = LocalDeployer;