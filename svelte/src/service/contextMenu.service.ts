import { showContextMenuIPC } from './ipc.service'
import { selectedAlbumId, selectedSongsStore } from '../store/final.store'

export function handleContextMenuEvent(e: MouseEvent) {
	e.preventDefault()

	const pathsName = e.composedPath().map((path: HTMLElement) => path.tagName)

	if (pathsName.includes('ALBUM')) {
		let albumElement: HTMLElement = e.composedPath().find((path: HTMLElement) => path.tagName === 'ALBUM') as HTMLElement

		let albumId = albumElement.getAttribute('id')

		showContextMenuIPC('AlbumContextMenu', {
			albumId
		})
	}

	if (pathsName.includes('SONG-LIST')) {
		let albumId
		let songs

		selectedAlbumId.subscribe((_) => (albumId = _))()
		selectedSongsStore.subscribe((_) => (songs = _))()

		showContextMenuIPC('SongContextMenu', {
			albumId,
			songs
		})
	}
}
