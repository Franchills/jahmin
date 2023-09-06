export default function (songId: number, type: 'reset' | 'increment') {
	window.ipc.updatePlayCount(songId, type).then(response => {
		let songElement = document.querySelector(`song-list-svlt data-row[data-id="${response.ID}"] song-tag playcount-tag`)

		if (songElement) songElement.innerHTML = String(response.PlayCount)
	})
}
