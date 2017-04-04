package storage

import (
	"io/ioutil"
	"os"
	"path/filepath"

	log "github.com/Sirupsen/logrus"
)

func pathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return true, err
}

func createStoreDir(path string) error {
	exists, err := pathExists(path)
	if err != nil {
		return err
	}
	if !exists {
		err := os.MkdirAll(path, 0777)
		if err != nil {
			return err
		}
	}
	return nil
}

func createEmptyFile(table string, path string) error {

	// create an empty file
	filename := path + string(filepath.Separator) + table + ".json"
	log.Debugf("Creating empty file %s", filename)
	err := ioutil.WriteFile(filename, []byte("{}"), 0644)
	if err != nil {
		return err
	}

	return nil
}
