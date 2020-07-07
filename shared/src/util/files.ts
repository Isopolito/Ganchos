import * as sh from 'shelljs';
import * as path from 'path';

const touch = async (configPath: string) => {
  sh.mkdir('-p', path.dirname(configPath));
  sh.touch(configPath);
}

const doesPathExist = (filePath: string) => sh.test('-f', filePath);

export {
  touch,
  doesPathExist,
}

