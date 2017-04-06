package storage

import (
	"os"
	"path/filepath"

	"github.com/muka/redzilla/model"
)

// PathExists check if a path exists
func PathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return true, err
}

//CreateDir create a directory recursively
func CreateDir(path string) error {
	exists, err := PathExists(path)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	err = os.MkdirAll(path, 0777)
	if err != nil {
		return err
	}
	return nil
}

// GetInstancesDataPath return the path where instance data is stored
func GetInstancesDataPath(name string, cfg *model.Config) string {
	path, err := filepath.Abs(cfg.InstanceDataPath)
	if err != nil {
		panic(err)
	}
	return filepath.Join(path, name)
}

// GetStorePath return the path where instance data is stored
func GetStorePath(name string, cfg *model.Config) string {
	path, err := filepath.Abs(cfg.StorePath)
	if err != nil {
		panic(err)
	}
	return filepath.Join(path, name)
}
