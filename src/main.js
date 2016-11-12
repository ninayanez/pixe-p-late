import url from 'url'
import path from 'path'
import electron from 'electron'
import imageToPlate from './imageToPlate.js'
import proc from 'child_process'
const app = electron.app
const BrowserWindow = electron.BrowserWindow

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 420, height: 320, resizable: false})

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname.replace('dist',''), 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () { app.quit() })

