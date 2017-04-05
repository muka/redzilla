package service

import (
	log "github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/api"
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
)

// Start the service
func Start(cfg *model.Config) error {

	msg := docker.ListenEvents(cfg)

	go func() {

		for {
			select {
			case ev := <-msg:
				// TODO: add logging
				log.Infof("Event %s", ev)
				break
			}
		}

	}()

	err := api.StartServer(cfg)
	if err != nil {
		return err
	}

	return nil
}
