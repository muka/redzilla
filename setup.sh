
basedir=`pwd`
if [ -e "/vagrant" ]; then
  basedir="/vagrant"
fi

sudo apt-get update -yq
sudo apt-get upgrade -y

cd $basedir

echo "install docker"
sudo wget -q -O /tmp/docker-install.sh https://gist.githubusercontent.com/wdullaer/f1af16bd7e970389bad3/raw/8ee28b111cf7f7367f2d01ed39d9862ae94f235e/install.sh
sudo sh /tmp/docker-install.sh

echo "install nodejs"
sudo apt-get install curl -y
curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -

sudo apt-get install -y nodejs g++

sudo npm i -g grunt-cli mocha forever

echo "install deps"
npm i

echo "build docker image"
sudo sh ./build-docker.sh

sudo ln -s $basedir/bin/redzilla /usr/local/bin/

sudo redzilla &
