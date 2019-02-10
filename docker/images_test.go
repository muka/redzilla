package docker

import (
	"testing"

	"github.com/sirupsen/logrus"
)

func TestEnsureRemoteImage(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	imageName := "docker.io/nodered/node-red-docker:latest"

	err := EnsureImage(imageName)
	if err != nil {
		t.Fatal(err)
	}

}

func TestEnsureLocalImage(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	imageName := "test3_api:latest"

	err := EnsureImage(imageName)
	if err != nil {
		t.Fatal(err)
	}

}
