import { appDataDir } from './app-dirs';
import type { ServerSettings } from './types';

export const production: ServerSettings = {
  dataDir: appDataDir()
};
