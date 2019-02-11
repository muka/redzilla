# redzilla

`redzilla` manage multiple instances of [node-red](http://nodered.org/)

## Usage

Start the service with `docker-compose`, by default it will run on port `3000`

`docker-compose up -d`

Create a new instance named `hello-world`

`curl -X POST http://redzilla.localhost:3000/v2/instances/hello-world`

Open in the browser

`xdg-open http://hello-world.redzilla.localhost:3000/`

Done!

### Using custom images

`ImageName` option allow to use local or remote custom images. Example:

- `ImageName: docker.io/nodered/node-red-docker:latest` Use the latest online version
- `ImageName: mycustom/nodered:latest` Use the `mycustom/nodered` local image


## Configuration

See `config.example.yml` for configuration options.

### Environment variables

- `REDZILLA_NETWORK` (default: `redzilla`) set the network where node-red instances will run
- `REDZILLA_APIPORT` (default: `:3000`)  changes the API host:port to listen for
- `REDZILLA_DOMAIN` (default: `redzilla.localhost`) set the base domain to listen for
- `REDZILLA_IMAGENAME` (default: `nodered/node-red-docker`) changes the `node-red` image to be spawn (must be somehow compatible to the official one)
- `REDZILLA_STOREPATH` (default: `./data/store`) file store for the container runtime metadata
- `REDZILLA_INSTANCEDATAPATH` (default: `./data/instances`) container instaces data (like setting.js and flows.json)
- `REDZILLA_LOGLEVEL` (default: `info`) log level detail
- `REDZILLA_AUTOSTART` (default: `false`) allow to create a new instance when reaching an activable subdomain
- `REDZILLA_ENVPREFIX` (empty by default) filter environment variables by prefix and pass to the created instance.
  Empty means no ENV are passed. The `${PREFIX}_` string will be removed from the variable name before passing to the instance. Example `NODERED` will match `NODERED_`, `RED` will match `REDZILLA_` and `RED_`
- `REDZILLA_CONFIG` load a configuration file (see `config.example.yml` for reference)

## API

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
