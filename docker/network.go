package docker

import (
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
			return &net, nil
		}
	}

	_, err = cli.NetworkCreate(ctx, networkID, types.NetworkCreate{
		CheckDuplicate: true,
	})
	if err != nil {
		return nil, err
	}

	net, err := cli.NetworkInspect(ctx, networkID)
	if err != nil {
		return nil, err
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
		return err
	}
	return nil
}
