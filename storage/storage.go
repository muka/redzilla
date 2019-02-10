package storage

import (
	"github.com/sirupsen/logrus"
	"github.com/muka/redzilla/model"
)

var store *Store

//GetStore return the store instance
func GetStore(collection string, cfg *model.Config) *Store {
	if store == nil {
		logrus.Debugf("Initializing store at %s", cfg.StorePath)
		store = NewStore(collection, cfg.StorePath)
	}
	return store
}
