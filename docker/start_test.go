package docker

import (
	"testing"

	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
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

	networkID := "redzilla_test"
	containerName := "container_redz_test_local"
	cfg := &model.Config{
		Network:            networkID,
		ImageName:          imageName,
		InstanceConfigPath: "../data/test",
		InstanceDataPath:   "../data/test",
	}

	err = StartContainer(containerName, cfg)
	if err != nil {
		t.Fatal(err)
	}

	net, err := GetNetwork(networkID)
	assert.NotEmpty(t, net.Containers)

	err = StopContainer(containerName, true)
	if err != nil {
		t.Fatal(err)
	}

}

func TestStartContainerRemote(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	containerName := "container_redz_test"
	cfg := &model.Config{
		Network:            "redzilla_test",
		ImageName:          "nodered/node-red-docker:latest",
		InstanceConfigPath: "../data/test",
		InstanceDataPath:   "../data/test",
	}

	err := StartContainer(containerName, cfg)
	if err != nil {
		t.Fatal(err)
	}

	err = StopContainer(containerName, true)
	if err != nil {
		t.Fatal(err)
	}

}
