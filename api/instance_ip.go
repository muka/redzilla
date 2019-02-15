package api

import (
	"fmt"
	"strings"

	"github.com/muka/redzilla/docker"
	"github.com/sirupsen/logrus"
)

//GetIP return the container IP
func (i *Instance) GetIP() (string, error) {

	ip := ""

	if i.instance.IP != "" {
		return i.instance.IP, nil
	}

	net, err := docker.GetNetwork(i.cfg.Network)
	if err != nil {
		return "", fmt.Errorf("GetNetwork: %s", err)
	}

	if len(net.Containers) == 0 {
		return "", fmt.Errorf("Network '%s' has no container attached", i.cfg.Network)
	}

	for _, container := range net.Containers {
		if container.Name == i.instance.Name {
			ip = container.IPv4Address[:strings.Index(container.IPv4Address, "/")]
			logrus.Debugf("Container IP %s", ip)
			break
		}
	}

	if ip == "" {
		return ip, fmt.Errorf("IP not found for container `%s`", i.instance.Name)
	}

	i.instance.IP = ip

	return ip, nil
}
