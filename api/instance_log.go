package api

import (
	"github.com/muka/redzilla/docker"
	"github.com/sirupsen/logrus"
)

//GetLogger Return the dedicated logger
func (i *Instance) GetLogger() *logrus.Logger {
	return i.logger.GetLogger()
}

//StartLogsPipe start the container log pipe
func (i *Instance) StartLogsPipe() error {
	logrus.Debugf("Start log pipe for %s", i.instance.Name)
	return docker.ContainerWatchLogs(i.logContext.GetContext(), i.instance.Name, i.logger.GetFile())
}

//StopLogsPipe stop the container log pipe
func (i *Instance) StopLogsPipe() {
	logrus.Debugf("Stopped log pipe for %s", i.instance.Name)
	i.logContext.Cancel()
}
