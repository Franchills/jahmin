export default [
	{ value: 'Album', name: 'Album' },
	{ value: 'AlbumArtist', name: 'Album Artist' },
	{ value: 'Artist', name: 'Artist' },
	{ value: 'BitRate', name: 'Bit Rate' },
	{ value: 'Comment', name: 'Comment' },
	{ value: 'Composer', name: 'Composer' },
	{ value: 'Date_Day', name: 'Date Day' },
	{ value: 'Date_Month', name: 'Date Month' },
	{ value: 'Date_Year', name: 'Date Year' },
	{ value: 'DiscNumber', name: 'Disc Number' },
	{ value: 'Duration', name: 'Duration' },
	{ value: 'Extension', name: 'Extension' },
	{ value: 'Genre', name: 'Genre' },
	{ value: 'ID', name: 'ID' },
	{ value: 'Rating', name: 'Rating' },
	{ value: 'SampleRate', name: 'Sample Rate' },
	{ value: 'Size', name: 'Size' },
	{ value: 'Title', name: 'Title' },
	{ value: 'Track', name: 'Track' },
	{ value: 'PlayCount', name: 'Play Count' }
].sort((a, b) => a.name.localeCompare(b.name))