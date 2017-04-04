package storage

import (
	log "github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/model"
)

var store *Store

//GetStore return the store instance
func GetStore(cfg *model.Config) *Store {

	log.Warn(store)
	log.Warn(&store)

	if store == nil {
		log.Infof("Initializing store at %s", cfg.StorePath)
		store = NewStore(cfg.StorePath)
	}

	log.Error(store)
	return store
}
