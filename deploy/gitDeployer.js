const simpleGit = require('simple-git');
const path = require('path');

class GitDeployer {
	constructor() {
		this.git = simpleGit(path.join(__dirname, '..', process.env.LOCAL_CSTATE_PATH));
		// Assumes LOCAL_CSTATE_PATH is the path to the Hugo site
	}

	async deploy(content, filePath) {
		try {
			const fullPath = path.join(
				__dirname,
				'..',
				process.env.LOCAL_CSTATE_PATH,
				filePath
			);
			require('fs').writeFileSync(fullPath, content);
			await this.git.add(fullPath);
			await this.git.commit('Automated incident update');
			await this.git.push(process.env.GIT_REMOTE, process.env.GIT_BRANCH);

			console.log(`Successfully deployed via Git to ${process.env.GIT_REMOTE}`);
		} catch (err) {
			console.error('Git deployment error:', err);
			throw err;
		}
	}
}

module.exports = GitDeployer;