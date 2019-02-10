package docker

import (
	"time"

	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

//StopContainer stop a container
func StopContainer(name string) error {

	logrus.Debugf("Stopping container %s", name)

	cli, err := getClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	info, err := GetContainer(name)
	if err != nil {
		return err
	}

	if info.ContainerJSONBase == nil {
		logrus.Warnf("Cannot stop %s, does not exists", name)
		return nil
	}

	containerID := info.ContainerJSONBase.ID
	timeout := time.Second * 5

	err = cli.ContainerStop(ctx, containerID, &timeout)
	if err != nil {
		return err
	}

	logrus.Debugf("Stopped container %s", name)
	return nil
}
