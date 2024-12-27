import dotenv from 'dotenv';

dotenv.config();

export default {
	checkInterval: 5 * 1000, // 60 seconds (adjust as needed)
	httpMonitor: {
		urls: [
			{
				id: 'example-site', // Unique identifier for the monitor
				name: 'Example Site',
				description: 'This is an example website', // Optional description
				url: 'https://www.example.com',
				method: 'GET', // HTTP method (default: GET)
				expectStatus: 200, // Expected HTTP status code (default: 200)
				followRedirect: false, // Follow redirects (default: false)
			},
		],
	},
	sslMonitor: {
		expirationThresholdDays: 14, // Warn if expiring within 14 days
		sites: [
		],
	},
	dnsMonitor: {
		sites: [
			{
				name: "API",
				url: "https://www.example.com",
				dnsConfig: {
					host: "example.com", // The domain to resolve
					recordType: "A", // The type of DNS record (A, AAAA, MX, etc.)
					expectedValue: "93.184.215.13", // The expected IP address or value
				},
			},
			// Add more sites here
		],
	},
	portMonitor: {
		timeout: 5000, // Timeout in milliseconds
		sites: [
		],
	},
	pingMonitor: {
		timeout: 5, // Timeout in seconds
		sites: [
		],
	},
	testMode: false, // Set to true for testing, false for actual deployment
	deployment: {
		method: 'local', // Default deployment method (local, ftp, or git)
	},
	escalationThreshold: 5, // Number of consecutive failures before escalating to 'down'
	initialDelay: 2, // Number of initial consecutive failures to ignore (optional)
	incidentMessages: {
		initial:
			'*Automated system alert* - We are sensing a disruption in our {{type}} monitor. This means that end users may experience issues with our "{{site.name}}". This may be temporary.',
		escalated:
			`This issue has been ongoing for a number of consecutive checks and has been escalated to a **severe** status. A human has been alerted and will take action as soon as possible. For support, please contact us on the information present on this website\'s homepage.`,
		resolved: 'The issue with our system "{{site.name}}" has been resolved.',
	},
};