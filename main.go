package main

import (
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
)

func main() {

	cfg := model.Config{
		ImageName: "nodered/node-red-docker",
	}

	err := docker.StartContainer("red3", &cfg)
	if err != nil {
		panic(err)
	}

	select {}

}
