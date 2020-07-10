import { fileUtil, generalConfig, generalLogger, SeverityEnum } from 'ganchas-shared';
import { spawn, Thread, Worker } from "threads";

export const run = async (event: string, filePath: string): Promise<void> => {
	console.log(`RunPlugin fired. Event - ${event}; FilePath - ${filePath}`);

	const fetchGithubProfile = await spawn(new Worker("./pluginCollection/git-fetch"))
	const andywer = await fetchGithubProfile("Isopolito")

	console.log(`User "Isopolito" has signed up on ${new Date(andywer.created_at).toLocaleString()}`)

	await Thread.terminate(fetchGithubProfile)
}