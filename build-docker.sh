
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

if [ ! -e node-red/red.js ]; then
  npm i -g grunt-cli
  git submodule init
  git submodule update
  cd node-red
  npm i
  grunt build
  cd ..
fi

cd docker
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
