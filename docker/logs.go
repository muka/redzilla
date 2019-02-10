package docker

import (
	"bufio"
	"errors"
	"io"

	"github.com/sirupsen/logrus"
	"github.com/docker/docker/api/types"
	"golang.org/x/net/context"
)

// ContainerWatchLogs pipe logs from the container instance
func ContainerWatchLogs(ctx context.Context, name string, writer io.Writer) error {

	cli, err := getClient()
	if err != nil {
		return err
	}

	info, err := GetContainer(name)
	if err != nil {
		return err
	}
	if info.ContainerJSONBase == nil {
		return errors.New("Container not found " + name)
	}

	containerID := info.ContainerJSONBase.ID

	out, err := cli.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{
		ShowStderr: true,
		ShowStdout: true,
		Follow:     true,
	})

	if err != nil {
		logrus.Warnf("Failed to open logs %s: %s", name, err.Error())
		return err
	}

	// if logrus.GetLevel() == logrus.DebugLevel {
	go func() {
		logrus.Debug("Printing instances log")
		buf := bufio.NewScanner(out)
		for buf.Scan() {
			logrus.Debugf("%s", buf.Text())
		}
	}()
	// }

	go func() {
		// pipe stream, will stop when container stops
		if _, err := io.Copy(writer, out); err != nil {
			logrus.Warnf("Error copying log stream %s", name)
		}
	}()

	return nil
}
