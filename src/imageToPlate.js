import fs from 'fs'
import path from 'path'
import through from 'through2'
import _ from 'underscore'
import THREE from 'three'
import exportStl from './exportStl.js'
import floydDither from 'floyd-steinberg'
import getPixels from 'get-pixels'
import sharp from 'sharp'
import yaml from 'yamljs'


const printer = yaml.load(__dirname.replace('/dist','')+'/default.yml')
let printable = false
const pixelGeo = new THREE.CubeGeometry(
  printer.line, 
  printer.line, 
  printer.line
)

const map = { // front : 8,9 & back : 10,11
  right : 0, // faces 0,1
  left : 2, // faces 2,3
  top : 4, // faces 4,5
  bottom : 6 // faces 6,7
}


function pixelBounds (bed) {
  bed.width = bed.width - 20 // x margin
  bed.height = bed.height - 20 // y margin
  return {
    w: parseInt(bed.width/bed.line), 
    h: parseInt(bed.height/bed.line)
  }
}


export default function (opts, output) {
  printable = new THREE.Geometry()
  const fileName = path.basename(opts.file)
  const dirName = path.dirname(opts.file)

  const prePix = sharp(opts.file) // check img dim and scale to fit printer
  prePix.metadata((e, info) => {
    const bounds = pixelBounds(printer)
    output({log:'processing '+opts.file})
    if (info.height>bounds.h || info.width>bounds.w) {
      opts.file = dirName+'/sm_'+fileName
      if (info.width>info.height) prePix.resize(bounds.w, null)
      else prePix.resize(null, bounds.w)
      prePix.toFile(opts.file, (err) => {
        if (err) console.error(e)
        processImage(opts, output)
      })
    } else processImage(opts, output) 
  })
}


function processImage (opts, output) {
  let color = false
  const ext = path.extname(opts.file)
  const bwPath = opts.file.replace(ext, '_bw' + ext)
  const stlPath = opts.file.replace('sm_','').replace(ext, '.stl')
  getPixels(opts.file, (e, pixels) => { 
    const w = pixels.shape[0]
    const h = pixels.shape[1]
    const packagedPixels = {
      width : w, height: h, data: pixels.data, stlFileName: stlPath
    }

    for(let x = 0; x < w; x++) { // clumsy check first row for bw
      const val = pixels.data[((w*0)+x)*4]
      if (val !== 0 || val !== 255) { color = true; break }
    }

    if (color) {
      pixels.data = floydDither(pixels).data
      packagedPixels.data = pixels.data
    }

    output({preview:pixels})
    output({log:'|･ω･)ﾉ making 3D plate from image pixels...'})

    setTimeout(() => {
      pixelsToGeometry(packagedPixels, output) 
    }, 80)
  })
}


function pixelsToGeometry (opts, output) {
  // 1 unit / pixel is === to 1 mm
  // units have to equal printer line width
  const w = opts.width
  const h = opts.height
  const pixArray = opts.data
  const baseGeo = new THREE.CubeGeometry(
    w * printer.line,
    h * printer.line,
    4 * printer.line
  )
  baseGeo.center()


  for(let y = 0; y < h; y++) { // y row
    for(let x = 0; x < w; x++) { // x across y
      const val = pixArray[((w*y)+x)*4]
      const sides = { // find connected pixels
        right : (pixArray[((w*y)+(x+1))*4] === 0) ? true : false,
        left : (pixArray[((w*y)+(x-1))*4] === 0) ? true : false,
        top : (pixArray[((w*(y-1))+x)*4] === 0) ? true : false,
        bottom : (pixArray[((w*(y+1))+x)*4] === 0) ? true : false
      }
      if (val===0) savePixel(x,y,sides)
    }
  }

  printable.scale(1,1,(3*printer.line)) 
  printable.center() 

  const base = new THREE.Mesh(baseGeo)
  base.position.z = -(3*printer.line)
  base.updateMatrix()

  printable.merge(base.geometry, base.matrix)

  const model = new THREE.Mesh(printable)
  model.name = opts.stlFileName
  output({log: 'exporting STL file...'})
  exportStl(model, output)
}


function savePixel (x,y,sides) {
  const pixel = new THREE.Mesh(pixelGeo.clone())
  let m = _.clone(map)

  pixel.position.x = (x * printer.line)
  pixel.position.y = -(y * printer.line)

  _.each(sides, (v,k) => { // remove colliding side
    if (v) { 
      pixel.geometry.faces.splice(m[k],2)
      _.each(m, (f,c) => { if (c!==k) m[c] = f-2})
    }
  })

  pixel.updateMatrix()
  printable.merge(pixel.geometry,pixel.matrix)
}
