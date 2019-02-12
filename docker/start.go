package docker

import (
	"fmt"
	"os"
	"strconv"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/storage"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

//StartContainer start a container
func StartContainer(name string, cfg *model.Config) error {

	logrus.Debugf("Starting docker container %s", name)

	cli, err := getClient()
	if err != nil {
		return err
	}

	err = EnsureImage(cfg.ImageName)
	if err != nil {
		return fmt.Errorf("EnsureImge: %s", err)
	}

	_, err = GetNetwork(cfg.Network)
	if err != nil {
		return fmt.Errorf("Failed to get network %s", cfg.Network)
	}

	info, err := GetContainer(name)
	if err != nil {
		return fmt.Errorf("GetContainer error: %s", err)
	}

	ctx := context.Background()

	exists := info.ContainerJSONBase != nil
	logrus.Debugf("Container %s exists: %t", name, exists)

	var containerID string

	if !exists {

		labels := map[string]string{
			"redzilla":          "1",
			"redzilla_instance": "redzilla_" + name,
		}

		exposedPorts := map[nat.Port]struct{}{
			"1880/tcp": {},
		}

		instanceConfigPath := storage.GetConfigPath(cfg)
		instanceDataPath := storage.GetInstancesDataPath(name, cfg)
		binds := []string{
			instanceDataPath + ":/data",
			instanceConfigPath + ":/config",
		}

		envVars := extractEnv(cfg)

		logrus.Debugf("Creating new container %s ", name)
		logrus.Debugf("Bind paths: %v", binds)
		logrus.Debugf("Env: %v", envVars)

		resp, err1 := cli.ContainerCreate(ctx,
			&container.Config{
				User:         strconv.Itoa(os.Getuid()), // avoid permission issues
				Image:        cfg.ImageName,
				AttachStdin:  false,
				AttachStdout: true,
				AttachStderr: true,
				Tty:          true,
				ExposedPorts: exposedPorts,
				Labels:       labels,
				Env:          envVars,
			},
			&container.HostConfig{
				Binds:       binds,
				NetworkMode: container.NetworkMode(cfg.Network),
				PortBindings: nat.PortMap{
					"1880": []nat.PortBinding{
						nat.PortBinding{
							HostIP:   "",
							HostPort: "1880",
						},
					}},
				// AutoRemove: true,

				// Links           []string          // List of links (in the name:alias form)
				// PublishAllPorts bool              // Should docker publish all exposed port for the container
				// Mounts []mount.Mount `json:",omitempty"`
			},
			nil, // &network.NetworkingConfig{},
			name,
		)
		if err1 != nil {
			return err1
		}

		containerID = resp.ID
		logrus.Debugf("Created new container %s", name)
	} else {
		containerID = info.ContainerJSONBase.ID
		logrus.Debugf("Reusing container %s", name)
	}

	logrus.Debugf("Starting `%s` (ID:%s)", name, containerID)

	if err = cli.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return err
	}

	// _, err = cli.ContainerWait(ctx, containerID)
	// if err != nil {
	// 	return fmt.Errorf("Failed to start container: %s", err)
	// }

	// out, err := cli.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{ShowStdout: true})
	// if err != nil {
	// 	return fmt.Errorf("Cannot open container logs: %s", err)
	// }
	// io.Copy(os.Stdout, out)

	logrus.Debugf("Started container %s", name)

	return nil
}
