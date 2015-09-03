
if [ ! -e node-red/red.js ]; then
  git submodule init
  git submodule update
  cd node-red
fi;

cd docker;

mkdir node-red

cp -r ../node-red/bin ./node-red/
cp -r ../node-red/nodes ./node-red/
cp -r ../node-red/locales ./node-red/
cp -r ../node-red/editor ./node-red/
cp -r ../node-red/public ./node-red/
cp -r ../node-red/red ./node-red/
cp    ../node-red/red.js ./node-red/
cp    ../node-red/package.json ./node-red/


docker build -t muka/redzilla .

rm node-red -r
