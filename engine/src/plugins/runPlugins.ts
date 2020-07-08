import { fileUtil, generalConfig, generalLogger, SeverityEnum } from 'ganchas-shared';

export const run = async (event: string, filePath: string): Promise<void> => {
  console.log(`RunPlugin fired. Event - ${event}; FilePath - ${filePath}`);
}