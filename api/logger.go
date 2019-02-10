package api

import (
	"io"
	"os"
	"path/filepath"

	"github.com/sirupsen/logrus"
)

var loggerInstances = make(map[string]*InstanceLogger)

// NewInstanceLogger create a new instance and cache it
func NewInstanceLogger(name string, path string) (*InstanceLogger, error) {
	if _, ok := loggerInstances[name]; !ok {
		err := createInstanceLogger(name, path)
		if err != nil {
			return nil, err
		}
	}
	return loggerInstances[name], nil
}

//CloseInstanceLoggers close all file loggers
func CloseInstanceLoggers() {
	for name, instanceLogger := range loggerInstances {
		instanceLogger.Close()
		delete(loggerInstances, name)
	}
}

//InstanceLogger a logger for a container instance
type InstanceLogger struct {
	Name   string
	Path   string
	file   *os.File
	logger *logrus.Logger
}

//GetLogger return the actual logger
func (i *InstanceLogger) GetLogger() *logrus.Logger {
	return i.logger
}

//GetFile return the file writer
func (i *InstanceLogger) GetFile() io.Writer {
	return i.file
}

//Close close open file loggers
func (i *InstanceLogger) Close() {
	i.file.Close()
}

func createInstanceLogger(name string, path string) error {

	filename := filepath.Join(path, "instance.log")

	logrus.Debugf("Create log for %s at %s", name, path)

	f, err := os.OpenFile(filename, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return err
	}

	// Create a new instance of the logger. You can have any number of instances.
	log := logrus.New()
	log.Formatter = &logrus.TextFormatter{}
	log.Out = f

	li := &InstanceLogger{
		Name:   name,
		Path:   filename,
		file:   f,
		logger: log,
	}

	loggerInstances[name] = li

	return nil
}
