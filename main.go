package main

import (
	log "github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/api"
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
)

func main() {

	cfg := model.NewDefaultConfig()

	err := api.StartServer(cfg)
	if err != nil {
		panic(err)
	}

}

func startContainer(cfg *model.Config) {

	name := "red3"

	err := docker.StartContainer(name, cfg)
	if err != nil {
		panic(err)
	}

	// log.Info("Ok, stopping now")
	// err = docker.StopContainer(name)
	// if err != nil {
	// 	panic(err)
	// }

	log.Info("Done")

}
