package storage

import (
	log "github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/model"
)

var store *Store

//GetStore return the store instance
func GetStore(collection string, cfg *model.Config) *Store {
	if store == nil {
		log.Infof("Initializing store at %s", cfg.StorePath)
		store = NewStore(collection, cfg.StorePath)
	}
	return store
}
