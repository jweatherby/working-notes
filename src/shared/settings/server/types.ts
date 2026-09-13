export interface ServerSettings {
  /** Root for all local state: the SQLite database, uploaded files and backups. */
  readonly dataDir: string;
}
