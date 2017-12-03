# redzilla

`redzilla` is a service which allow to create easily instances of [node-red](http://nodered.org/)

Currently uses docker and traefik to create a scalable yet configurable service.

## Usage

Start the service with `docker-compose`, in this example it will run on port `3000`

`docker-compose up -d`

Create a new instance named `hello-world`

`curl -X POST http://redzilla.localhost:3000/v2/instances/hello-world`

Open in the browser

`xdg-open http://hello-world.redzilla.localhost:3000/`

Done!

## Configuration

Environment variables

`REDZILLA_NETWORK` (default: `redzilla`) set the network where node-red instances will run

`REDZILLA_APIPORT` (default: `:3000`)  changes the API host:port to listen for

`REDZILLA_DOMAIN` (default: `redzilla.localhost`) set the base domain to listen for

`REDZILLA_IMAGENAME` (default: `nodered/node-red-docker`) changes the `node-red` image to be spawn (must be somehow compatible to the official one)

`REDZILLA_STOREPATH` (default: `./data/store`) file store for the container runtime metadata

`REDZILLA_INSTANCEDATAPATH` (default: `./data/instances`) container instaces data (like setting.js and flows.json)

`REDZILLA_LOGLEVEL` (default: `info`) log level detail

`REDZILLA_AUTOSTART` (default: `false`) allow to create a new instance when reaching an activable subdomain

`REDZILLA_CONFIG` load a configuration file (see `config.example.yml` for reference)

## API

API is temporary and subject to change

List instances

  `curl -X GET http://redzilla.localhost:3000/v2/instances`

Create or start an instance

  `curl -X POST http://redzilla.localhost:3000/v2/instances/instance-name`

Restart an instance (stop + start)

  `curl -X POST http://redzilla.localhost:3000/v2/instances/instance-name`

Stop an instance

  `curl -X DELETE http://redzilla.localhost:3000/v2/instances/instance-name`

## Prerequisites

To run `redzilla` you need `docker` and `docker-compose` installed.

## License

The MIT license. See `LICENSE` file for details
