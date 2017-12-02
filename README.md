# redzilla

`redzilla` is a service which allow to create easily instances of [node-red](http://nodered.org/)

Currently uses docker and traefik to create a scalable yet configurable service.

Usage
---

Start the service with `docker-compose`, in this example it will run on port `3000`

`docker-compose up -d`

Create a new instance named `hello-world`

`curl -X POST http://redzilla.localhost:3000/v2/instances/hello-world`

Open in the browser

`xdg-open http://hello-world.redzilla.localhost:3000/`

Done!

Configuration
---

Environment variables

- `PORT` changes the API host:port to listen for. Default to `:3000`
- `IMAGE` changes the `node-red` image to be spawn (must be somehow compatible to the official one). Default to `node-red/node-red-docker`
- `NETWORK` set the network where node-red instances will run. Default to `redzilla`
- `DOMAIN` set the base domain to listen for. Default to `redzilla.localhost`

API
---

API is temporary and subject to change

List instances

  `curl -X GET http://redzilla.localhost:3000/v2/instances`

Create or start an instance

  `curl -X POST http://redzilla.localhost:3000/v2/instances/instance-name`

Restart an instance (stop + start)

  `curl -X POST http://redzilla.localhost:3000/v2/instances/instance-name`

Stop an instance

  `curl -X DELETE http://redzilla.localhost:3000/v2/instances/instance-name`

Prerequisites
---

To run `redzilla` you need `docker` and `docker-compose` installed.

For example on a recent ubuntu linux

- Install docker `wget -qO- https://get.docker.com/ | sh`
- Install docker-compose `sudo apt-get install python-pip -y && sudo pip install docker-compose`

License
---

The MIT license. See `LICENSE` file for details
