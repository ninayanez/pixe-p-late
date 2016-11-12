import electron from 'electron'
import _ from 'underscore'
import yaml from 'yamljs'
import imageToPlate from './imageToPlate.js'
import path from 'path'
import proc from 'child_process'

let file = null
const spinner = document.querySelector('.spinner')
const cvs = document.createElement('canvas')
const ctx = cvs.getContext('2d')
document.body.appendChild(cvs)
const log = document.querySelector('.status span')

document.addEventListener('dragover', (e) => {e.preventDefault()}, false)
document.addEventListener('drop', (e) => { 
  e.preventDefault()
	if (e.dataTransfer.files.length === 1) {
    file = e.dataTransfer.files[0]
    inputHandler('preview '+file.path)
    imageToPlate({file:file.path}, inputHandler)
	}
	else return false
},false)

function inputHandler (d) {
  spinner.style.opacity = 0
  if (d.preview) {
    const data = new ImageData(
      new Uint8ClampedArray(d.preview.data),
      d.preview.shape[0],
      d.preview.shape[1]
    )
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    cvs.width = data.width
    cvs.height = data.height
    cvs.style.marginLeft = -(data.width/2) + 'px' 
    cvs.style.marginTop = -(data.height/2) + 'px'
    ctx.putImageData(data,0,0)
  }
  if (d.open) {
    log.innerHTML = 'Saved STL to '+path.dirname(file.path)
    proc.exec('open '+path.dirname(d.open), (e,se,so) => { 
       console.log(e,se,so) 
       // if (!e) log.innerHTML = 'drop an image onto this window!'  
    })
  }
  if (d.log) {
    if (d.log.match('exporting'))
      spinner.style.opacity = 1
    log.innerHTML = d.log
  }
}
