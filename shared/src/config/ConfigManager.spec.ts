import 'mocha';
import { expect } from 'chai';
import * as path from 'path';
import * as sh from 'shelljs';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';
import * as generalLogger from '../logging/generalLogger'
import { ConfigManager } from './ConfigManager';

describe('** Config Manager **', () => {
  let config: GeneralConfig;
  let configManager: ConfigManager;
  const configFilePath = path.join(sh.tempdir(), 'test_config_file');

  before(() => {
      config = {
          userPluginPaths: ['/home/user/foo'],
          heartBeatPollIntervalInSeconds: 5,
          userPluginMetaExtension: 'foo',
          enableDebug: true,
          lastUpdatedTimeStamp: 0,
      };
  });

  describe('Calling methods to access config file when it the file does not exist', () => {
      before(() => {
          configManager = new ConfigManager(configFilePath, generalLogger.write ,async () => { }); 
      });

      it('getJson method should return null (and log to general logger), but throw no errors', async () => {
          const jsonConfig = await configManager.getJson();

          expect(jsonConfig).to.be.null;
      });
  });

  after(() => {
      configManager = null as any;
  });
});