package api

import (
	"encoding/json"

	log "github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/storage"
)

var instanceCollection = "instances"

//ListInstances list available instances
func ListInstances(cfg *model.Config) (*model.Instances, error) {

	store := storage.GetStore(cfg)

	log.Warn(store)

	jsonlist, err := store.List(instanceCollection)
	if err != nil {
		return nil, err
	}

	list := make(model.Instances, len(jsonlist))
	for _, jsonstr := range jsonlist {
		item := model.Instance{}
		err = json.Unmarshal([]byte(jsonstr), item)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}

	return &list, err
}

// NewInstance new instance api
func NewInstance(name string, cfg *model.Config) *Instance {
	i := Instance{
		instance: model.NewInstance(name),
		cfg:      cfg,
		store:    storage.GetStore(cfg),
	}
	return &i
}

//Instance API
type Instance struct {
	instance *model.Instance
	cfg      *model.Config
	store    *storage.Store
}

//Start instance
func (i *Instance) Start() error {

	log.Debugf("Starting instance %s", i.instance.Name)

	err := i.store.Save(instanceCollection, i.instance.Name, i.instance)
	if err != nil {
		return err
	}

	err = docker.StartContainer(i.instance.Name, i.cfg)
	if err != nil {
		return err
	}

	return nil
}

//Stop instance
func (i *Instance) Stop() error {

	log.Debugf("Stopping instance %s", i.instance.Name)

	err := i.store.Delete(instanceCollection, i.instance.Name)
	if err != nil {
		return err
	}

	err = docker.StopContainer(i.instance.Name)
	if err != nil {
		return err
	}

	return nil
}

//Exists instance
func (i *Instance) Exists() (bool, error) {

	log.Debugf("Check if instance %s exists", i.instance.Name)

	info, err := docker.GetContainer(i.instance.Name)
	if err != nil {
		return false, err
	}

	return info.ContainerJSONBase != nil, nil
}

//Restart instance
func (i *Instance) Restart(name string) error {
	i.Stop()
	return i.Start()
}
