export type DatabaseStatus = 'not-configured' | 'configured' | 'connected' | 'unavailable'

let databaseStatus: DatabaseStatus = 'not-configured'

export function setDatabaseStatus(status: DatabaseStatus) {
  databaseStatus = status
}

export function getDatabaseStatus() {
  return databaseStatus
}
