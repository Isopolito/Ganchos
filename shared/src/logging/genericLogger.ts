import os from 'os';
import { promises as fs } from 'fs';

import { touch } from '../util/files';
import { makeLogFilePath } from '../util/logs';

const write = async (name: string, messageJson: string): Promise<void> => {
	if (!messageJson || !name) return;

	const filePath = makeLogFilePath(name);
	touch(filePath);

	await fs.appendFile(filePath, messageJson + os.EOL);
}

/*========================================================================================*/

export {
	write,
}