package docker

import (
	"testing"

	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
)

func TestStartContainerLocal(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	// create local image
	dockerFilePath := "../test"
	imageName := "nodered_local1_test"

	err := BuildImage(imageName, dockerFilePath)
	if err != nil {
		t.Fatal(err)
	}

	containerName := "container_redz_test_local"
	cfg := &model.Config{
		Network:   "redzilla_test",
		ImageName: imageName,
	}

	err = StartContainer(containerName, cfg)
	if err != nil {
		t.Fatal(err)
	}

	err = StopContainer(containerName)
	if err != nil {
		t.Fatal(err)
	}

	err = RemoveImage(imageName, true)
	if err != nil {
		t.Fatal(err)
	}

}

func TestStartContainerRemote(t *testing.T) {

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
