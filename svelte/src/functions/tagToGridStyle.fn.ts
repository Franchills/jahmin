import type { SelectedTagType } from '../types/selectedTag.type'

export default function (tags: SelectedTagType[]) {
	let gridStyle = ''

	if (tags.length>0) {
		tags.forEach(tag => {
			if (tag.size === 'Collapse') {
				gridStyle += ' max-content'
			} else if (tag.size === 'Expand') {
				gridStyle += ' auto'
			}
		})
	}

	return gridStyle
}
