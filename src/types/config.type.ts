export type ConfigType = {
	bounds?: BoundsType
	directories: DirectoriesType
	group?: GroupType
	groupOnlyByFolder?: boolean
	songListTags?: any[]
	userOptions: UserOptionsType
}

type DirectoriesType = {
	add: string[]
	exclude: string[]
}

type UserOptionsType = {
	theme?: ThemeOptions
	equalizerId?: string
	songAmount?: number
	gridGap?: number
	artSize?: number
	contrastRatio?: number
	fontSize?: number
}

export enum ThemeOptions {
	Auto = 'Auto',
	Dark = 'Dark',
	Light = 'Light'
}

type GroupType = {
	groupBy: string[]
	groupByValues: string[]
}

type BoundsType = {
	x: number
	y: number
	height: number
	width: number
}
