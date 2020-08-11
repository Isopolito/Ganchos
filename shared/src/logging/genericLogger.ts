import * as properLockFile from 'proper-lockfile';
import { promises as fs } from 'fs';
import os from 'os';

import { touch } from '../util/files';
import { makeLogFilePath } from '../util/logs';

/*========================================================================================*/

const write = async (name: string, messageJson: string): Promise<void> => {
	if (!messageJson) return;

	const filePath = makeLogFilePath(name);
	await touch(filePath);

	const release = await properLockFile.lock(filePath, { retries: 5});
	await fs.appendFile(filePath, messageJson + os.EOL);
	await release();
}

/*========================================================================================*/

export {
	write,
}