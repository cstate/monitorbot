# cState MonitorBot

The cState MonitorBot is a Node.js-based monitoring tool that checks the status of websites and services and creates incident reports for your Hugo/cState static site. It's designed to be self-hosted and can deploy incident reports via local file system updates, FTP, or Git.

## Features

*   **Multiple Check Types:**
    *   **HTTP(S) Status:** Checks if websites are up and returning the expected HTTP status codes.
    *   **SSL Certificate:** Monitors SSL certificate validity and expiration dates.
    *   **DNS Resolution:** Verifies that DNS records are resolving correctly.
    *   **Port/TCP Connectivity:** Checks if specific ports on a server are reachable.
    *   **Ping (ICMP):** Measures latency and checks if hosts are reachable via ICMP echo requests.
*   **Flexible Deployment:**
    *   **Local:** Updates incident reports directly on the local file system where your Hugo/cState site is located.
    *   **FTP:** Deploys incident reports to a remote server via FTP.
    *   **Git:** Commits and pushes incident reports to a Git repository (e.g., GitHub, GitLab).
*   **Test Mode:** Allows you to run checks and see the results without actually creating or modifying incident files.
*   **Configurable:** Easily configure the sites to monitor, check intervals, and other settings.
*   **Color-Coded Output:** Uses `chalk` to provide clear and informative color-coded output in the console.
*   **Incident Report Format:** Generates incident reports in Markdown format with frontmatter for easy integration with cState.
*   **Extensible, e.g. for staff notifications (your own)**: Can act as push service for notifications if extended with custom code.

## Requirements

*   **Node.js:** Version 14 or higher (recommended to use the latest LTS version).
*   **npm:** Usually comes bundled with Node.js.
*   **Hugo/cState:** You should have a Hugo site set up with cState installed to display the incident reports.

## Installation

1. **Clone the repository:**

```bash
git clone https://github.com/cstate/monitorbot.git
cd monitorbot
```

2. **Install dependencies:**

```bash
npm install
```

## Configuration

1. **Environment Variables (`.env`):**

Create a `.env` file in the root of the project and configure the following variables based on your deployment method:

**Local Deployment:**

```
LOCAL_CSTATE_PATH=../cstate  # Relative path to your Hugo/cState site
```

**FTP Deployment:**

```
FTP_HOST=your_ftp_host
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/path/to/remote/cstate/content/issues
```

**Git Deployment:**

```
GIT_REMOTE=your_git_remote_url (e.g., git@github.com:user/repo.git)
GIT_BRANCH=main  # Or your default branch
LOCAL_CSTATE_PATH=../cstate  # Relative path to your Hugo/cState site (for Git, it's used as a working directory)
```

2. **Configuration File (`config.js`):**

Modify the `config.js` file to set up the sites you want to monitor and adjust other settings:

```javascript
export default {
	runningMethod: 'cron', // 'cron' for continuous process or 'single' for check once and quit
	checkInterval: 5 * 1000, // 5 seconds (adjust as needed), only for cron running method
	testMode: true, // Set to false for actual deployment
	deployment: {
	method: 'local', // Deployment method: local, ftp, or git
	},
	httpMonitor: {
	urls: [
		{
		name: "Example Site",
		url: "https://www.example.com",
		followRedirect: false, // Follow redirects (default: false)
		expectStatus: 200, // Expected HTTP status code (default: 200)
		method: 'GET', // HTTP method (default: GET)
		maxRedirects: 5, // Maximum number of redirects to follow (default: 5)
		},
		// ... more sites
	],
	},
	sslMonitor: {
	expirationThresholdDays: 14, // Warn if expiring within 14 days
	sites: [
		{
		name: "Example Site",
		url: "https://www.example.com",
		},
		// ... more sites
	],
	},
	dnsMonitor: {
	sites: [
		{
		name: "Example Site",
		url: "https://www.example.com",
		dnsConfig: {
			host: "example.com",
			recordType: "A",
			expectedValue: "93.184.216.34", // Expected IP
		},
		},
		// ... more sites
	],
	},
	portMonitor: {
	timeout: 5000, // Timeout in milliseconds
	sites: [
		{
		name: "Example Site",
		url: "https://www.example.com",
		portConfig: {
			port: 80, // Port to check
		},
		},
		// ... more sites
	],
	},
	pingMonitor: {
	timeout: 5, // Timeout in seconds
	sites: [
		{
		name: "Example Site",
		url: "https://www.example.com",
		},
		// ... more sites
	],
	},
};
```

## Usage

### Test Mode (Dry Run)

To run the checks without creating/modifying incident files, make sure `testMode` is set to `true` in `config.js`. Then run:

```bash
node index.js
```

If you edit the `config.js` file, you will need to restart the script for the changes to take effect.

This will output the results of the checks to the console in a color-coded format.

### Deployment Mode to Host (Create/Update Incidents)

*   Set `testMode` to `false` in `config.js`.
*   Choose your deployment method (`local`, `ftp`, or `git`) in `config.js`.
*   Make sure your `.env` file is configured correctly for your chosen deployment method.
*   Run:

```bash
node index.js
```

This will perform the checks and create/update incident Markdown files in your Hugo/cState site based on the results.

#### Scheduling

 When the bot uses the `cron` running method, it uses `cron` to run checks periodically. The default interval is set to 60 seconds in `config.js`. You can adjust the `checkInterval` value or modify the cron expression in `index.js` for more advanced scheduling.

**Example (run every 5 minutes):**

```javascript
// In index.js
const job = new CronJob(
  '0 */5 * * * *', // Cron expression for every 5 minutes
  runChecks,
  null,
  true,
  'America/Los_Angeles'
);
```

### Deployment Mode in GitLab Pipelines *(experimental)*

This deployment mode relies on the cron scheduler of GitLab pipelines. The bot will run the checks once in the pipeline, perform an issue deployment if necessary and quit. The *incident state* is transferred between pipeline runs using the pipeline cache. 

> **Note**: when a cache miss occurs (e.g. due to a network error), the *incident state* is reset, which may result in false positives in your monitor. Deploying the `incident_state.json` every once in a while should make it more reliable, but for simple monitoring tasks using the cache should suffice most of the times.

*   Set `testMode` to `false` and `runningMode` to `single` in `config.js`.
*   Choose your deployment method (`local`, `ftp`, or `git`) in `config.js`.
*   Make sure your `.env` file is configured correctly for your chosen deployment method.
*   When choosing deployment method `git`, make sure to add the git package in the `.gitlab-ci.yml`, by uncommenting the corresponding line.

```yaml
# In .gitlab-ci.yml
  before_script:
    - echo "Installing dependencies..."
    - apk add git  # <-- uncomment this line when using Git deployment method
    - bun install --no-save
```

*   In GitLab, schedule a pipeline for this repository for a chosen interval in **Project** > **Build** > **Pipeline schedules**.

On a small GitLab runner, this pipeline should take about **~20 seconds**, depending on the amount of checks you do.

## Incident Report Format

Incident reports are generated as Markdown files in the `content/issues` directory of your Hugo/cState site. They use the following frontmatter:

```
---
title: "Incident Title"
date: 2024-01-10T12:00:00Z
resolved: false
section: issue
automated: true
severity: "down"  # Or "disrupted", "notice"
affected: ["Example Site"]
id: "http-status-example-site"
---

Incident description here...
```

## Contributing

Contributions are welcome! If you find a bug or want to add a new feature, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
