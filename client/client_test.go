package client

import (
	"fmt"
	"testing"

	"github.com/docker/docker/api/types"
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
)

func startContainer(t *testing.T) (*types.ContainerJSON, func()) {

	logrus.SetLevel(logrus.DebugLevel)

	containerName := "container_redz_test_api"
	cfg := &model.Config{
		Network:            "redzilla_test",
		ImageName:          "nodered/node-red-docker:latest",
		InstanceConfigPath: "../data/test",
		InstanceDataPath:   "../data/test",
		Autostart:          true,
	}

	err := docker.StartContainer(containerName, cfg)
	if err != nil {
		t.Fatal(err)
	}

	info, err := docker.GetContainer(containerName)
	if err != nil {
		t.Fatal(err)
	}

	return info, func() {
		err = docker.StopContainer(containerName, true)
		if err != nil {
			t.Fatal(err)
		}
	}

}

func TestClientMethods(t *testing.T) {

	info, _ := startContainer(t)

	// info, stopContainer := startContainer(t)
	// defer stopContainer()

	ip := info.NetworkSettings.Networks["redzilla_test"].IPAddress

	c, err := NewClient(ClientOptions{
		BaseUrl: fmt.Sprintf("http://%s:1880", ip),
	})
	if err != nil {
		t.Fatal(err)
	}

	authScheme, err := c.AuthLoginGet()
	if err != nil {
		t.Fatal(err)
	}
	logrus.Debugf("AuthLoginGet: %++v", authScheme)

	if authScheme.IsActive() {
		t.Fatal("AuthScheme should not be enabled")
	}

	// Review this method
	_, err = c.AuthToken(NewAuthTokenRequest())
	if err != nil {
		// t.Fatal(err)
		logrus.Debugf("AuthToken err: %++v", err)
	}
	// logrus.Debugf("AuthToken: %++v", authToken)

	if authScheme.IsActive() {
		t.Fatal("AuthScheme should not be enabled")
	}

	list, err := c.FlowsList()
	if err != nil {
		t.Fatal(err)
	}
	logrus.Debugf("FlowsList: %++v", list)

}
