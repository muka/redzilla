package service

import (
	"github.com/Sirupsen/logrus"
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

				instance := api.GetInstance(ev.Name, cfg)

				exists, err := instance.Exists()
				if err != nil {
					logrus.Errorf("Failed loading instance %s", ev.Name)
					continue
				}
				if !exists {
					continue
				}

				switch ev.Action {
				case "die":
					logrus.Warnf("Container exited %s", ev.Name)
					instance.StopLogsPipe()
					break
				case "start":
					err = instance.StartLogsPipe()
					if err != nil {
						logrus.Warnf("Cannot start logs pipe for %s: %s", ev.Name, err.Error())
					}
					break
				default:
					logrus.Infof("Container %s %s", ev.Action, ev.Name)
					break
				}

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

// Stop the service
func Stop(cfg *model.Config) {

	api.CloseInstanceLoggers()
}
