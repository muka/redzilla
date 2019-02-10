package docker

import (
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/muka/redzilla/model"
)

func TestStartContainer(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	containerName := "container_redz_test"
	cfg := &model.Config{
		Network:   "redzilla_test",
		ImageName: "nodered/node-red-docker:latest",
	}

	err := StartContainer(containerName, cfg)
	if err != nil {
		t.Fatal(err)
	}

	err = StopContainer(containerName)
	if err != nil {
		t.Fatal(err)
	}

}
