import fs from 'fs'
import path from 'path'

import mm from 'music-metadata'

import { Worker } from 'worker_threads'

import getAppDataPathFn from '../functions/getAppDataPath.fn'
import getDirectoryFn from '../functions/getDirectory.fn'
import getArrayBufferHashFn from '../functions/getArrayBufferHash.fn'
import hashStringFn from '../functions/hashString.fn'
import { getWorker } from './workers.service'
import sendWebContentsFn from '../functions/sendWebContents.fn'
import getAllFilesInFoldersDeep from '../functions/getAllFilesInFoldersDeep.fn'

const videoFormats = ['mp4', 'webm']
const animatedFormats = ['apng', 'avif', 'webp', 'gif']
const vectorFormats = ['svg']
const imageFormats = ['png', 'jpg', 'jpeg']

const validFormats = [...videoFormats, ...animatedFormats, ...vectorFormats, ...imageFormats]

const validNames = ['cover', 'folder', 'front', 'art', 'album']

const allowedFiles = validNames.map(name => validFormats.map(ext => `${name}.${ext}`)).flat()

let sharpWorker: Worker

getWorker('sharp').then(worker => {
	if (!sharpWorker) {
		sharpWorker = worker

		sharpWorker.on('message', handleSharpWorkerResponse)
	}
})

let ffmpegImageWorker: Worker

getWorker('ffmpegImage').then(worker => {
	if (!ffmpegImageWorker) {
		ffmpegImageWorker = worker

		ffmpegImageWorker.on('message', handleFfmpegImageWorkerResponse)
	}
})

function handleSharpWorkerResponse(data: any) {
	delete data.artData

	sendWebContentsFn('new-image-art', data)
}

function handleFfmpegImageWorkerResponse(data: any) {
	sendWebContentsFn('new-animation-art', data)
}

export function handleArtService(filePath: string, elementId: string, size: number) {
	if (isNaN(size) || !filePath || !elementId) return

	if (!fs.existsSync(filePath)) {
		sendWebContentsFn('new-image-art', {
			artPath: null,
			elementId
		})
		return
	}

	const isDirectory = fs.statSync(filePath).isDirectory()

	// If it is a file
	if (!isDirectory) {
		handleFileArt(filePath, elementId, size)
	} else {
		handleFolderArt(filePath, elementId, size)
	}
}

function handleFolderArt(folderPath: string, elementId: string, size: number) {
	let albumId = hashStringFn(folderPath) as string

	let artOutputDirPath = path.join(getAppDataPathFn(), 'arts', String(size))
	let artOutputPath = path.join(artOutputDirPath, albumId) + '.webp'

	if (!fs.existsSync(artOutputDirPath)) fs.mkdirSync(artOutputDirPath, { recursive: true })

	if (fs.existsSync(artOutputPath)) {
		sendWebContentsFn('new-image-art', {
			artPath: artOutputPath,
			elementId
		})
		return
	}

	let allowedArtFiles = getAllowedFiles(folderPath)

	let videoArts = allowedArtFiles.filter(file => videoFormats.includes(getExtension(file)))
	let animatedArts = allowedArtFiles.filter(file => animatedFormats.includes(getExtension(file)))
	let imageArts = allowedArtFiles.filter(file => imageFormats.includes(getExtension(file)))

	if (videoArts.length !== 0) {
		return handleFolderVideoArt(videoArts, elementId)
	}

	if (animatedArts.length !== 0) {
		return handleFolderAnimatedArt(animatedArts, elementId, size)
	}

	if (imageArts.length !== 0) {
		return handleFolderImageArt(imageArts, artOutputPath, elementId, size)
	}

	sendWebContentsFn('new-image-art', {
		artPath: null,
		elementId
	})
}

function handleFolderImageArt(artPaths: string[], artOutputPath: string, elementId: string, size: number) {
	let bestArtFile = artPaths.sort((fileA, fileB) => fs.statSync(fileB).size - fs.statSync(fileA).size)[0] || undefined

	if (!bestArtFile) {
		sendWebContentsFn('new-image-art', {
			artPath: null,
			elementId
		})
		return
	}

	sendWebContentsFn('new-image-art', {
		artPath: bestArtFile,
		elementId
	})

	let extension = getExtension(bestArtFile)

	if (imageFormats.includes(extension)) {
		compressArt(bestArtFile, artOutputPath, elementId, size)
	}
}

function handleFolderVideoArt(artPaths: string[], elementId: string) {
	let artPath = artPaths[0]

	if (artPath !== undefined) {
		sendWebContentsFn('new-video-art', {
			artPath,
			elementId
		})
	} else {
		sendWebContentsFn('new-video-art', {
			artPath: null,
			elementId
		})
	}
}

function handleFolderAnimatedArt(artPaths: string[], elementId: string, size: number) {
	let artPath = artPaths[1]

	if (artPath) {
		sendWebContentsFn('new-animation-art', {
			artPath: artPaths[1],
			elementId
		})

		ffmpegImageWorker.postMessage({
			artPath: artPaths[1],
			elementId,
			size,
			appDataPath: getAppDataPathFn()
		})
	} else {
		sendWebContentsFn('new-animation-art', {
			artPath: null,
			elementId
		})
	}
}

function handleFileArt(filePath: string, elementId: string, size: number) {
	const fileNameHash = hashStringFn(filePath) as string
	const embeddedArtDirectory = path.join(getAppDataPathFn(), 'arts', 'embedded', String(size))

	if (!fs.existsSync(embeddedArtDirectory)) fs.mkdirSync(embeddedArtDirectory, { recursive: true })

	let embeddedArtPath =
		getAllFilesInFoldersDeep([embeddedArtDirectory])
			.filter(file => !file.endsWith('.webp'))
			.filter(file => !file.endsWith('.DS_Store'))
			.filter(file => file.endsWith(fileNameHash))[0] || undefined

	if (embeddedArtPath) {
		let finalArtPath = path.join(getDirectoryFn(embeddedArtPath), 'cover.webp')

		if (fs.existsSync(finalArtPath)) {
			sendWebContentsFn('new-image-art', {
				artPath: finalArtPath,
				elementId
			})
		}
	}

	mm.parseFile(filePath).then(({ common }) => {
		const cover = mm.selectCover(common.picture)

		if (cover === null) {
			return handleArtService(getDirectoryFn(filePath), elementId, size)
		}

		const artHash = getArrayBufferHashFn(cover.data)
		const artDirectory = path.join(embeddedArtDirectory, artHash)

		if (!fs.existsSync(artDirectory)) fs.mkdirSync(artDirectory, { recursive: true })

		// If the art is the same as the one saved it was already sent before
		if (embeddedArtPath?.split('/').at(-1)?.split('.')[0] === artHash) {
			return
		} else {
			if (embeddedArtPath) {
				fs.rmSync(getDirectoryFn(embeddedArtPath), { recursive: true })
			}
		}

		compressArt(cover.data, path.join(artDirectory, 'cover.webp'), elementId, size)

		fs.writeFileSync(path.join(artDirectory, `${artHash}.${fileNameHash}`), '')
	})
}

function compressArt(artData: Buffer | string, artPath: string, elementId: string, size: number) {
	sharpWorker.postMessage({
		artData,
		artPath,
		elementId,
		size
	})
}

// Returns all images sorted by priority.
export function getAllowedFiles(rootDir: string) {
	let allowedArtFiles = fs
		.readdirSync(rootDir)
		.filter(file => allowedFiles.includes(file.toLowerCase()))
		.map(file => path.join(rootDir, file))
		.sort((a, b) => {
			// Gets the priority from the index of the valid formats above.
			// mp4 has a priority of 0 while gif has a priority of 3, lower number is higher priority.
			let aExtension = validFormats.indexOf(getExtension(a))
			let bExtension = validFormats.indexOf(getExtension(b))

			return aExtension - bExtension
		})

	return allowedArtFiles
}

function getExtension(data: string) {
	return data.split('.').pop() || ''
}
