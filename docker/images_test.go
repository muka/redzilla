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
	imageName := "test_local_image_build"
	err := BuildImage(imageName, "../test")
	if err != nil {
		t.Fatal(err)
	}

	err = EnsureImage(imageName)
	if err != nil {
		t.Fatal(err)
	}

	err = RemoveImage(imageName)
	if err != nil {
		t.Fatal(err)
	}

}

func TestBuildImageFail(t *testing.T) {

	logrus.SetLevel(logrus.DebugLevel)

	imageName := "test_local_image_build"
	err := BuildImage(imageName, "../test/build_fail")
	if err == nil {
		t.Fatal("Build shoul fail")
	}

}
