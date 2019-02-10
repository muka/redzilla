package docker

import (
	"errors"
	"fmt"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

func EnsureImage(imageName string) error {

	if imageName == "" {
		return errors.New("Image name cannot be empty")
	}

	cli, err := getClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	f := filters.NewArgs()
	f.ExactMatch("Name", imageName)
	localImages, err := cli.ImageList(ctx, types.ImageListOptions{
		Filters: f,
	})

	if len(localImages) > 0 {
		for _, image := range localImages {
			for _, tag := range image.RepoTags {
				if imageName == tag || imageName+":latest" == tag {
					logrus.Debugf("Found local image %s", imageName)
					return nil
				}
			}
		}
	}

	logrus.Debugf("Pulling image %s if not available", imageName)
	_, err = cli.ImagePull(ctx, imageName, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("Image pull failed: %s", err)
	}

	logrus.Debugf("Pulled image %s", imageName)
	return nil
}
