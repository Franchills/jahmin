import { parentPort } from 'worker_threads'
// import { getAacTags } from '../formats/aac.format'
// import { getFlacTags } from '../formats/flac.format'
// import { getMp3Tags } from '../formats/mp3.format'
// import { getOpusTags } from '../formats/opus.format'
// import { OptionsType } from '../types/options.type'
// import { SongType } from '../types/song.type'

parentPort?.on('message', (options: any) => {
	// if (options.task === 'Get Song Data') {
	// 	getSongTags(options.data.path).then((data) => {
	// 		parentPort?.postMessage({
	// 			task: options.task,
	// 			data
	// 		})
	// 	})
	// }

	// if (options.task === 'Not Tasks Left') {
	// 	parentPort?.postMessage({
	// 		task: options.task
	// 	})
	// }
})

// function getSongTags(path: string): Promise<SongType> {
// 	return new Promise((resolve, reject) => {
// 		let extension = path.split('.').pop() || undefined

// 		if (extension === 'm4a') {
// 			getAacTags(path).then((data) => resolve(data))
// 		} else if (extension === 'opus') {
// 			getOpusTags(path).then((data) => resolve(data))
// 		} else if (extension === 'flac') {
// 			getFlacTags(path).then((data) => resolve(data))
// 		} else if (extension === 'mp3') {
// 			getMp3Tags(path).then((data) => resolve(data))
// 		}
// 	})
// }
