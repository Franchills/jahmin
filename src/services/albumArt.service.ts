import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

//@ts-ignore
import imageInfo from 'image-info'
import { appDataPath } from '..'
import { mkdirSync } from 'original-fs'
import { getConfig } from './config.service'
import { hash } from '../functions/hashString.fn'

const validVideoExtensions = ['gif', 'mp4']
const validImageExtensions = ['jpg', 'jpeg', 'png', 'webp']
const validExtensions = [...validImageExtensions, ...validVideoExtensions]
const validNames = ['cover', 'folder', 'front', 'art']

export function getAlbumCover(rootDir: /* Root Directory */ string) {
	return new Promise(async (resolve, reject) => {
		let imagePathArray: string[] = []
		let rootDirHashed = hash(rootDir)
		let config = getConfig()
		let dimension = config?.['art']?.['dimension']
		let artDirPath = path.join(appDataPath(), 'art', String(dimension))
		let artPath = path.join(artDirPath, rootDirHashed) + '.webp'

		if (fs.existsSync(artPath)) {
			return resolve({ fileType: 'image', filePath: artPath })
		}

		try {
			fs.readdirSync(rootDir).forEach((file) => {
				const ext /*extension*/ = file.split('.').pop()

				if (ext === undefined) return

				if (validExtensions.includes(ext)) {
					// return resolve(path.join(rootDir, file))
					imagePathArray.push(path.join(rootDir, file))
				}
			})
		} catch (err) {
			return resolve(null)
		}

		imagePathArray = imagePathArray.filter((imagePath) => validNames.includes(getFileNameWithoutExtension(imagePath)))

		// If no images with proper naming are found in folder
		if (imagePathArray.length === 0) {
			return resolve(null)
		}

		const videoCoverFound = imagePathArray.find((file) => validVideoExtensions.includes(file.split('.').pop()))

		if (videoCoverFound) {
			return resolve({ fileType: 'video', filePath: videoCoverFound })
		}

		const webpCoverFound = imagePathArray.find((file) => file.split('.').pop() === 'webp')

		if (webpCoverFound) {
			return resolve({ fileType: 'image', filePath: webpCoverFound })
		}

		let bestImagePath = await getBestImageFromArray(imagePathArray)

		// let compressedImagePath = getImageCompressed(bestImagePath)

		resolve({ fileType: 'image', filePath: bestImagePath })
		//Compress Image AFTER sending it the renderer to avoid waiting for compression.
		compressImage(bestImagePath, artDirPath, artPath)
	})
}

function getImageCompressed(filePath: string) {
	let config = getConfig()
	let dimension = config?.['art']?.['dimension']
	let artDirPath = path.join(appDataPath(), 'art', String(dimension))
	let fileHash = `${hash(filePath)}.webp`
	let compressedFilePath = path.join(artDirPath, fileHash)

	if (fs.existsSync(compressedFilePath)) {
		return compressedFilePath
	} else {
		return undefined
	}
}

function compressImage(filePath: string, artDirPath: string, artPath: string) {
	let config = getConfig()
	let dimension = config?.['art']?.['dimension']

	if (!fs.existsSync(artDirPath)) {
		mkdirSync(artDirPath, { recursive: true })
	}

	sharp(filePath)
		.resize({
			height: dimension * 2,
			width: dimension * 2
		})
		.webp({
			quality: 50
		})
		.toFile(artPath)
}

function getFileNameWithoutExtension(filePath: string) {
	let fileNameWithExt = filePath.split('/').pop()

	if (!fileNameWithExt) return ''

	let fileNameWithoutExt = fileNameWithExt.split('.').shift()

	if (!fileNameWithoutExt) return ''

	return fileNameWithoutExt
}

type BestImageType = { quality: number; imagePath: string }

function getBestImageFromArray(imagePathArray: string[]): Promise<string> {
	return new Promise(async (resolve, reject) => {
		let bestImage: BestImageType = { quality: 0, imagePath: '' }

		for (let [index, imagePath] of imagePathArray.entries()) {
			let quality = await getQuality(imagePath)

			if (quality > bestImage['quality']) {
				// console.log('New Quality: ', quality, ' Old quality: ', bestImage['quality'])
				bestImage = {
					quality,
					imagePath
				}
			}

			if (imagePathArray.length === index + 1) {
				resolve(bestImage['imagePath'])
			}
		}
	})
}

function getQuality(imagePath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		imageInfo(imagePath, (err: any, info: any) => {
			if (err) {
				return console.log(err)
			} else {
				let quality = info['width'] * info['height'] * info['bytes']

				resolve(quality)
			}
		})
	})
}
