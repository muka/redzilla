package docker

import (
	"errors"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Sirupsen/logrus"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/storage"
	"golang.org/x/net/context"
)

//ContainerEvent store a container event
type ContainerEvent struct {
	ID      string
	Name    string
	Action  string
	Message events.Message
}

var eventsChannel = make(chan ContainerEvent)
var dockerClient *client.Client

//GetEventsChannel return the main channel reporting docker events
func GetEventsChannel() <-chan ContainerEvent {
	return eventsChannel
}

// ListenEvents watches docker events an handle state modifications
func ListenEvents(cfg *model.Config) <-chan ContainerEvent {

	cli, err := getClient()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	// ctx1 := context.Background()
	// ctx, cancel := context.WithCancel(ctx1)

	f := filters.NewArgs()
	f.Add("label", "redzilla=1")
	// <-chan events.Message, <-chan error
	msgChan, errChan := cli.Events(ctx, types.EventsOptions{
		Filters: f,
	})

	go func() {
		for {
			select {
			case event := <-msgChan:
				if &event != nil {

					logrus.Infof("Event recieved: %s %s ", event.Action, event.Type)
					if event.Actor.Attributes != nil {

						// logrus.Infof("%s: %s | %s | %s | %s | %s", event.Actor.Attributes["name"], event.Action, event.From, event.ID, event.Status, event.Type)

						name := event.Actor.Attributes["name"]
						switch event.Action {
						case "start":
							logrus.Debugf("Container started %s", name)
							break
						case "die":
							logrus.Debugf("Container exited %s", name)
							break
						}

						ev := ContainerEvent{
							Action:  event.Action,
							ID:      event.ID,
							Name:    name,
							Message: event,
						}
						eventsChannel <- ev

					}
				}
			case err := <-errChan:
				if err != nil {
					logrus.Errorf("Error event recieved: %s", err.Error())
				}
			}
		}
	}()

	return eventsChannel
}

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

	logrus.Debugf("Starting docker container %s", name)

	cli, err := getClient()
	if err != nil {
		return err
	}

	// containerID := "red3"
	// options := types.ContainerStartOptions{}
	ctx := context.Background()

	logrus.Debugf("Pulling image %s if not available", cfg.ImageName)
	_, err = cli.ImagePull(ctx, cfg.ImageName, types.ImagePullOptions{})
	if err != nil {
		return err
	}

	logrus.Debugf("Pulled image %s", cfg.ImageName)

	info, err := GetContainer(name)
	if err != nil {
		return err
	}

	exists := info.ContainerJSONBase != nil
	logrus.Debugf("Container %s exists: %t", name, exists)

	var containerID string

	if !exists {

		logrus.Debugf("Creating new container %s ", name)
		resp, err := cli.ContainerCreate(ctx,
			&container.Config{
				User:         strconv.Itoa(os.Getuid()), // avoid permission issues
				Image:        cfg.ImageName,
				AttachStdin:  false,
				AttachStdout: true,
				AttachStderr: true,
				Tty:          true,
				ExposedPorts: map[nat.Port]struct{}{
					"1880/tcp": {},
				},
				Labels: map[string]string{
					"redzilla":                     "1",
					"traefik.backend":              name,
					"traefik.port":                 "1880",
					"traefik.frontend.entryPoints": "http",
				},
			},
			&container.HostConfig{
				Binds: []string{
					storage.GetInstancesDataPath(name, cfg) + ":/data",
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
		logrus.Debugf("Created new container %s", name)
	} else {
		containerID = info.ContainerJSONBase.ID
		logrus.Debugf("Reusing container %s", name)
	}

	logrus.Debugf("Container %s with ID %s", name, containerID)

	if err = cli.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return err
	}

	logrus.Debugf("Started container %s", name)

	// if _, err = cli.ContainerWait(ctx, containerID); err != nil {
	// 	return err
	// }
	// debug("Waited container")

	return nil
}

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

	go func() {
		// pipe stream, will stop when container stops
		if _, err := io.Copy(writer, out); err != nil {
			logrus.Warnf("Error copying log stream %s", name)
		}
	}()

	return nil
}

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

// GetContainer return container info by name
func GetContainer(name string) (*types.ContainerJSON, error) {

	ctx := context.Background()
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

	return &json, nil
}
