import { parentPort } from 'worker_threads'
import { addTaskToQueue } from './db/!db.js'
import initDBFn from './db/initDB.fn.js'
import closdDBFn from './db/closeDB.fn.js'
import { eventEmitter } from './db/dbVersion.fn.js'
import { selectGeneric } from './db/bulkRead.fn.js'
import updatePlayCountFn from './db/updatePlayCount.fn.js'
import updateIsEnabledFn from './db/updateIsEnabled.fn.js'

import type { DatabaseMessageType } from '../types/databaseWorkerMessage.type.js'
import { getIsDBConnected } from './functions/dbState.fn.js'

let appDataPathGlobal = ''

let closeDbTimeout: NodeJS.Timeout

parentPort!.on('message', async msg => {
	// Check if db is open, if not, open it first

	// If db is open, close it after 10 seconds of inactivity
	// Gets reset every time a message is received
	clearTimeout(closeDbTimeout)

	// Returns a new timeout
	closeDbTimeout = getCloseDbTimeout()

	// If db is not open, open it
	if (msg.type !== 'initDb' && getIsDBConnected() === false) {
		await initDb(appDataPathGlobal)
	}

	switch (msg.type) {
		case 'initDb':
			initDb(msg.data.appDataPath)
			break
		case 'closeDb':
			closeDb()
			break
		case 'create':
			create(msg)
			break
		case 'update':
			update(msg)
			break
		case 'delete':
			delete_(msg)
			break
		case 'read':
			read(msg)
			break
		case 'update-play-count':
			updatePlayCount(msg)
			break
		case 'update-is-enabled':
			updateIsEnabled(msg)
			break
	}
})

eventEmitter.on('dbVersionChange', newValue => {
	parentPort!.postMessage({
		type: 'dbVersionChange',
		data: newValue
	})
})

function create(msg: DatabaseMessageType) {
	addTaskToQueue(msg.data, 'create')
}

function update(msg: DatabaseMessageType) {
	addTaskToQueue(msg.data, 'update')
}

function delete_(msg: DatabaseMessageType) {
	addTaskToQueue(msg.data, 'delete')
}

function read(msg: DatabaseMessageType) {
	selectGeneric({ ...msg.data.queryData, workerCallId: msg.workerCallId }).then(data => {
		parentPort!.postMessage({
			type: msg.type,
			workerCallId: msg.workerCallId,
			results: data
		})
	})
}

function updatePlayCount(msg: DatabaseMessageType) {
	updatePlayCountFn({ ...msg.data.queryData, workerCallId: msg.workerCallId }).then(data => {
		parentPort!.postMessage({
			type: msg.type,
			workerCallId: msg.workerCallId,
			results: data
		})
	})
}

function updateIsEnabled(msg: DatabaseMessageType) {
	updateIsEnabledFn({ ...msg.data.queryData, workerCallId: msg.workerCallId })
}

function initDb(appDataPath: string) {
	return new Promise((resolve, reject) => {
		if (appDataPathGlobal === '') {
			appDataPathGlobal = appDataPath
		}

		import('./db/!db.js').then(() => {
			initDBFn(appDataPath).then(() => {
				resolve(null)
			})
		})
	})
}

function closeDb() {
	closdDBFn()
}

function getCloseDbTimeout() {
	return setTimeout(() => {
		closeDb()
	}, 10000)
}
