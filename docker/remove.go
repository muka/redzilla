package docker

import (
	"github.com/docker/docker/api/types"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

//RemoveContainer remove a container instance
func RemoveContainer(name string) error {

	logrus.Debugf("Removing container %s", name)

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
		logrus.Warnf("Cannot remove %s, does not exists", name)
		return nil
	}

	containerID := info.ContainerJSONBase.ID

	err = cli.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{
		Force: true,
	})
	if err != nil {
		logrus.Warnf("ContainerRemove: %s", err)
	}

	logrus.Debugf("Removed container %s", name)
	return nil
}
