package main

import (
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/config"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/service"
	"github.com/sirupsen/logrus"
)

func setupLogger(cfg *model.Config) error {

	lvl, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		return fmt.Errorf("Failed to parse level %s: %s", cfg.LogLevel, err)
	}
	logrus.SetLevel(lvl)

	if lvl != logrus.DebugLevel {
		gin.SetMode(gin.ReleaseMode)
	}

	return nil
}

func main() {

	err := config.Init()
	if err != nil {
		logrus.Errorf("Failed to init config: %s", err)
		os.Exit(1)
	}

	cfg, err := config.GetApiConfig()
	if err != nil {
		logrus.Errorf("Failed to get config: %s", err)
		os.Exit(1)
	}

	err = setupLogger(cfg)
	if err != nil {
		logrus.Errorf("Failed to setup logger: %s", err)
		os.Exit(1)
	}

	defer service.Stop(cfg)

	err = service.Start(cfg)
	if err != nil {
		logrus.Errorf("Error: %s", err.Error())
		os.Exit(1)
	}

}
