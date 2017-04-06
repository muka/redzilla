package main

import (
	"github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/service"
)

func main() {

	cfg := model.NewDefaultConfig()

	logrus.SetLevel(logrus.DebugLevel)

	defer service.Stop(cfg)

	err := service.Start(cfg)
	if err != nil {
		logrus.Errorf("Error: %s", err.Error())
		panic(err)
	}

}
