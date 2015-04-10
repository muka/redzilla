if [ ! -e node_modules/node-red ]; then
	npm i
fi;


cd docker; 


mkdir node-red

cp -r ../node_modules/node-red/bin ./node-red/
cp -r ../node_modules/node-red/nodes ./node-red/
cp -r ../node_modules/node-red/public ./node-red/
cp -r ../node_modules/node-red/red ./node-red/
cp  ../node_modules/node-red/red.js ./node-red/
cp  ../node_modules/node-red/package.json ./node-red/

docker build -t muka/redzilla .

rm node-red -r

