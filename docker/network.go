package docker

import (
	"fmt"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"golang.org/x/net/context"
)

//GetNetwork inspect a network by networkID
func GetNetwork(networkID string) (*types.NetworkResource, error) {

	cli, err := getClient()
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	filter := filters.NewArgs()
	filter.Match("Name", networkID)
	list, err := cli.NetworkList(ctx, types.NetworkListOptions{
		Filters: filter,
	})
	if err != nil {
		return nil, err
	}

	for _, net := range list {
		if net.Name == networkID {
			return inspectNetwork(networkID)
		}
	}

	_, err = cli.NetworkCreate(ctx, networkID, types.NetworkCreate{
		CheckDuplicate: true,
		Attachable:     true,
		Driver:         "bridge",
	})
	if err != nil {
		return nil, fmt.Errorf("NetworkCreate: %s", err)
	}

	return inspectNetwork(networkID)
}

func inspectNetwork(networkID string) (*types.NetworkResource, error) {
	cli, err := getClient()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	net, err := cli.NetworkInspect(ctx, networkID, types.NetworkInspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("NetworkInspect: %s", err)
	}
	return &net, nil
}

func removeNetwork(networkID string) error {
	cli, err := getClient()
	if err != nil {
		return err
	}
	err = cli.NetworkRemove(context.Background(), networkID)
	if err != nil {
		return fmt.Errorf("NetworkRemove: %s", err)
	}
	return nil
}
