import { parentPort } from 'worker_threads'
import * as NodeID3 from 'node-id3'

parentPort?.on('message', data => {
	NodeID3.update(data.newTags, data.filePath, {}, err => {
		if (err) {
			parentPort?.postMessage({ filePath: data.filePath, status: -1 })
		} else {
			parentPort?.postMessage({ filePath: data.filePath, status: 1 })
		}
	})
})