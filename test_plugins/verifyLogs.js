const fs = require('fs');
var endOfLine = require('os').EOL;

const ganchosPath = process.argv.slice(2)[0];
if (!ganchosPath || !fs.existsSync(ganchosPath)) {
	console.log(`A path to the ganchos log file is required as a parameter. The log file must exist`);
	process.exit(1);
}

const removeSearchTermsThatAreFound = (searchTerms, logLine) => {
	let searchTermsToKeepLookingFor = [];
	for (searchTerm of searchTerms) {
		if (!searchTerm.regEx.test(logLine)) searchTermsToKeepLookingFor.push(searchTerm);
	}

	return searchTermsToKeepLookingFor;
}

fs.readFile(ganchosPath, (err, data) => {
	// Validation is very basic. Check each line of the log file against these regExes, if a match
	// is not found anywhere in the log file for a particular search term, display the message at the end.
	// This only works if the log file has been removed before each test run. An improvement would be to find the 
	// the start of each run within the log file and go from there
	let searchTerms = [
		{
			regEx: new RegExp(`.*"test_inetChange".*"event type: ipChange; oldIpAddress: [.\\d]+; newIpAddress: [.\\d]+".*`),
			message: `ipChange message not found in log. Was the external IP address changed during the tests? For example, by switching VPN servers`,
		},
		{
			regEx: new RegExp(`.*"test_inetUpDown".*"message":"Internet: inetUp".*`),
			message: `inetUp message not found in log (was the internet not turned on/off during test?)`,
		},
		{
			regEx: new RegExp(`.*"test_inetUpDown".*"message":"Internet: inetDown".*`),
			message: `inetDown message not found in log (was the internet not turned on/off during test?)`,
		},
		{
			regEx: new RegExp(`.*test eventType: unlinkDir".*`),
			message: `test_addOrDelete removed a directory but the unlinkDir event was not found in log`,
		},
		{
			regEx: new RegExp(`.*test eventType: addDir".*`),
			message: `test_addOrDelete created a directory but the addDir event was not found in log`,
		},
		{
			regEx: new RegExp(`.*test eventType: unlink".*`),
			message: `test_addOrDelete removed a file but the unlink event was not found in log`,
		},
		{
			regEx: new RegExp(`.*test eventType: add".*`),
			message: `test_addOrDelete created a file but the add event was not found in log`,
		},
	];

	if (err) return console.log(`Error reading log file: ${err}`);
	if (!data) return console.log(`Log file has no data`);

	const errorRegExp = new RegExp('.*"severity":[45],.*');
	const errors = [];
	const warningRegExp = new RegExp('.*"severity":3,.*');
	const warnings = [];

	for (const logLine of data.toString().split(endOfLine)) {
		if (errorRegExp.test(logLine)) errors.push(logLine);
		if (warningRegExp.test(logLine)) warnings.push(logLine);

		searchTerms = removeSearchTermsThatAreFound(searchTerms, logLine);
		if (searchTerms.length === 0) break;
	}

	if (searchTerms.length) {
		for (const searchTerm of searchTerms) console.log(searchTerm.message);
	} else {
		console.log(`All expected messages are in the log`);
	}

	if (errors.length) {
		console.log(`${endOfLine}** Errors were found:`)
		console.log(errors.join(endOfLine));
	}

	if (warnings.length) {
		console.log(`${endOfLine}* Warnings were found:`)
		console.log(warnings.join(endOfLine));
	}
});
