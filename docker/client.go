package docker

import (
	"strings"

	log "github.com/Sirupsen/logrus"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/muka/redzilla/model"
	dbg "github.com/tj/go-debug"
	"golang.org/x/net/context"
)

var debug = dbg.Debug("redzilla:docker")

var dockerClient *client.Client

//return a docker client
func getClient() (*client.Client, error) {

	if dockerClient == nil {
		cli, err := client.NewEnvClient()
		if err != nil {
			return nil, err
		}
		dockerClient = cli
	}

	return dockerClient, nil
}

//StartContainer start a container
func StartContainer(name string, cfg *model.Config) error {

	log.Info("Starting container")

	cli, err := getClient()
	if err != nil {
		return err
	}

	// containerID := "red3"
	// options := types.ContainerStartOptions{}
	ctx := context.Background()

	_, err = cli.ImagePull(ctx, cfg.ImageName, types.ImagePullOptions{})
	if err != nil {
		return err
	}

	log.Debugf("Pulled image %s", cfg.ImageName)

	// TODO: Inspect to check if name exists already
	info, err := GetContainer(ctx, name)
	if err != nil {
		return err
	}

	exists := info != nil
	debug("%s exists %t", name, exists)

	var containerID string

	if !exists {

		resp, err := cli.ContainerCreate(ctx,
			&container.Config{
				Image:        cfg.ImageName,
				AttachStdin:  false,
				AttachStdout: true,
				AttachStderr: true,
				Tty:          true,
				ExposedPorts: map[nat.Port]struct{}{
					"1880/tcp": {},
				},
				Labels: map[string]string{
					"traefik.backend":              name,
					"traefik.port":                 "1880",
					"traefik.frontend.entryPoints": "http",
				},
			},
			&container.HostConfig{
				Binds: []string{
					"/home/l/go/src/github.com/muka/redzilla/tmp/" + name + ":/data",
				},
				NetworkMode: "redzilla_redzilla",
				PortBindings: nat.PortMap{
					"1880": []nat.PortBinding{
						nat.PortBinding{
							HostIP:   "",
							HostPort: "1880",
						},
					}},
				AutoRemove: true,
				// Links           []string          // List of links (in the name:alias form)
				// PublishAllPorts bool              // Should docker publish all exposed port for the container
				// Mounts []mount.Mount `json:",omitempty"`
			},
			nil, // &network.NetworkingConfig{},
			name,
		)
		if err != nil {
			return err
		}

		containerID = resp.ID
		log.Infof("Created container %s", containerID)
	} else {

		containerID = info.ID
		log.Infof("Reusing container %s", containerID)

	}

	if err = cli.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return err
	}

	log.Infof("Started container %s", containerID)

	// if _, err = cli.ContainerWait(ctx, containerID); err != nil {
	// 	return err
	// }
	// debug("Waited container")

	// out, err := cli.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{
	// 	ShowStderr: true,
	// 	ShowStdout: true,
	// 	Follow:     true,
	// })
	// if err != nil {
	// 	return err
	// }
	//
	// _, err = io.Copy(os.Stdout, out)
	// if err != nil {
	// 	return err
	// }

	log.Infof("Container %s started", containerID)

	return nil
}

//StopContainer stop a container
func StopContainer() error {
	return nil
}

// GetContainer return container info by name
func GetContainer(ctx context.Context, name string) (*types.ContainerJSON, error) {

	emptyJSON := &types.ContainerJSON{}

	cli, err := getClient()
	if err != nil {
		return emptyJSON, err
	}

	json, err := cli.ContainerInspect(ctx, name)
	if err != nil {
		if strings.Contains(err.Error(), "No such container") {
			return emptyJSON, nil
		}
		return emptyJSON, err
	}
	debug("Inspect %s: %s", name, json.ID)
	return &json, nil
}
