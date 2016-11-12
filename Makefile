rebuild:
	node_modules/.bin/electron-rebuild node_modules/sharp

build js: 
	mkdir -p dist 
	node_modules/.bin/babel src --out-dir dist

all:
	npm install
	make rebuild
	make build js
 
app:
	node_modules/.bin/electron-packager . pixe\(p\)late --arch x64 --platform darwin

run:
	node_modules/.bin/electron .
