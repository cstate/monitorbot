import dotenv from 'dotenv';

dotenv.config();

export default {
	checkInterval: 10 * 1000, // 60 seconds (adjust as needed)
	httpMonitor: {
		urls: [
			{
				name: "Website",
				url: "https://www.example.com",
				method: "GET",
			},
			{
				name: "Gateway",
				url: "https://www.anothersite.net",
				method: "GET",
			},
		],
	},
	sslMonitor: {
		expirationThresholdDays: 14, // Warn if expiring within 14 days
		sites: [
			{
				name: "Backup Gateway",
				url: "https://www.example.com",
			},
			{
				name: "API",
				url: "https://www.anothersite.net",
			},
			// Add more sites here
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
					expectedValue: "93.184.216.34", // The expected IP address or value
				},
			},
			// Add more sites here
		],
	},
	portMonitor: {
		timeout: 5000, // Timeout in milliseconds
		sites: [
			{
				name: "API",
				url: "https://www.example.com",
				portConfig: {
					port: 80, // The port to check
				},
			},
			// Add more sites and ports here
		],
	},
	pingMonitor: {
		timeout: 5, // Timeout in seconds
		sites: [
			{
				name: "FTP",
				url: "https://www.example.com",
			},
			// Add more sites here
		],
	},
	testMode: true, // Set to true for testing, false for actual deployment
	deployment: {
		method: 'local', // Default deployment method (local, ftp, or git)
	},
	incidentMessages: {
		initial:
			'*Automated system alert* - We are sensing a disruption in our {{type}} monitor. This means that end users may experience issues with our "{{site.name}}". This may be temporary.',
		escalated:
			'This issue has been ongoing for five consecutive checks and has been escalated to a **severe** status. A human has been alerted and will take action as soon as possible. For support, please contact us on the information present on this website\'s homepage.',
		resolved: 'The issue with our system "{{site.name}}" has been resolved.',
	},
};