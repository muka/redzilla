package docker

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/pkg/archive"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

type buildImageLog struct {
	Stream      string `json:"stream,omitempty"`
	ErrorDetail string `json:"errorDetail,omitempty"`
}

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
				// fmt.Println(tag)
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

func RemoveImage(imageName string, force bool) error {

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

	imageID := ""
	if len(localImages) > 0 {
		for _, image := range localImages {
			for _, tag := range image.RepoTags {
				// fmt.Println(tag)
				if imageName == tag || imageName+":latest" == tag {
					logrus.Debugf("Removing image %s (%s)", imageName, image.ID)
					imageID = image.ID
					break
				}
			}
			if imageID != "" {
				break
			}
		}
	}

	if imageID == "" {
		return fmt.Errorf("RemoveImage: Cannot find image %s", imageName)
	}

	_, err = cli.ImageRemove(context.Background(), imageID, types.ImageRemoveOptions{
		Force: force,
	})
	if err != nil {
		return err
	}

	return nil
}

func BuildImage(imageName, srcImageDir string) error {

	cli, err := getClient()
	if err != nil {
		return err
	}

	buildContext, err := archive.TarWithOptions(srcImageDir, &archive.TarOptions{})
	if err != nil {
		return fmt.Errorf("Tar failed: %s", err)
	}

	res, err := cli.ImageBuild(context.Background(), buildContext, types.ImageBuildOptions{
		Tags:           []string{imageName + ":latest"},
		SuppressOutput: false,
	})
	if err != nil {
		return fmt.Errorf("ImageBuild error: %s", err)
	}

	scanner := bufio.NewScanner(res.Body)

	for scanner.Scan() {

		// logrus.Debug(scanner.Text())

		line := new(buildImageLog)
		err := json.Unmarshal(scanner.Bytes(), line)
		if err != nil {
			return fmt.Errorf("Failed to parse log: %s", err)
		}

		if line.ErrorDetail != "" {
			logLine := strings.Replace(line.ErrorDetail, "\n", "", -1)
			logrus.Warnf("build log: %s", logLine)
			return fmt.Errorf("ImageBuild failed: %s", logLine)
		}

		logLine := strings.Replace(line.Stream, "\n", "", -1)
		logrus.Debugf("build log: %s", logLine)
	}

	logrus.Debugf("Created image %s", imageName)

	return nil
}
