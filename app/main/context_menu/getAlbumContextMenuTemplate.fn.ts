import { MenuItemConstructorOptions, shell } from "electron"
import sendWebContentsFn from "../functions/sendWebContents.fn"

export default function (data: any) {
  let template: MenuItemConstructorOptions[] = []

  template.push({
    label: `Show Folder`,
    click: () => {
      shell.openPath(data.albumRootDir || '')
    }
  })

  template.push({
    label: `Reload Album Data`,
    click: () => {
      // reloadAlbumData(data.albumId)
    }
  })

  template.push({
    label: `Reload Album Art`,
    click: () => {
      if (data.albumId) {
        sendWebContentsFn('get-art-sizes', {
          albumId: data.albumId
        })
      }
    }
  })

  return template
}