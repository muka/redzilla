package docker

import (
	"errors"
	"os"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/muka/redzilla/model"

	"golang.org/x/net/context"
)

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

func extractEnv(cfg *model.Config) []string {

	env := make([]string, 0)

	vars := os.Environ()

	envPrefix := strings.ToLower(cfg.EnvPrefix)
	pl := len(envPrefix)

	if pl > 0 {
		for _, e := range vars {

			if pl > 0 {
				if pl > len(e) {
					continue
				}
				if strings.ToLower(e[0:pl]) != envPrefix {
					continue
				}
			}

			//removed PREFIX_
			envVar := e[pl+1:]
			env = append(env, envVar)
		}

	}

	return env
}

// GetContainer return container info by name
func GetContainer(name string) (*types.ContainerJSON, error) {

	ctx := context.Background()
	emptyJSON := &types.ContainerJSON{}

	if len(name) == 0 {
		return emptyJSON, errors.New("GetContainer(): name is empty")
	}

	cli, err := getClient()
	if err != nil {
		return emptyJSON, err
	}

	json, err := cli.ContainerInspect(ctx, name)
	if err != nil {
		if client.IsErrNotFound(err) {
			return emptyJSON, nil
		}
		return emptyJSON, err
	}

	return &json, nil
}
