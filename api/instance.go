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
func ListInstances(cfg *model.Config) (*[]model.Instance, error) {

	store := storage.GetStore(instanceCollection, cfg)

	jsonlist, err := store.List()
	if err != nil {
		return nil, err
	}

	list := make([]model.Instance, len(jsonlist))
	for _, jsonstr := range jsonlist {
		item := &model.Instance{}
		err = json.Unmarshal([]byte(jsonstr), item)
		if err != nil {
			return nil, err
		}
		list = append(list, *item)
	}

	log.Debugf("Found %d instances", len(list))
	return &list, err
}

// NewInstance new instance api
func NewInstance(name string, cfg *model.Config) *Instance {
	i := Instance{
		instance: model.NewInstance(name),
		cfg:      cfg,
		store:    storage.GetStore(instanceCollection, cfg),
	}
	return &i
}

//Instance API
type Instance struct {
	instance *model.Instance
	cfg      *model.Config
	store    *storage.Store
}

//Save instance status
func (i *Instance) Save() error {

	log.Debugf("Saving instance state %s", i.instance.Name)

	err := i.store.Save(i.instance.Name, i.instance)
	if err != nil {
		return err
	}

	return nil
}

//Create instance without starting
func (i *Instance) Create() error {

	log.Debugf("Creating instance %s", i.instance.Name)

	err := i.Save()
	if err != nil {
		return err
	}

	return nil
}

//Start an instance creating a record for if it does not exists
func (i *Instance) Start() error {

	log.Debugf("Starting instance %s", i.instance.Name)

	err := i.Save()
	if err != nil {
		return err
	}

	err = docker.StartContainer(i.instance.Name, i.cfg)
	if err != nil {
		return err
	}

	return nil
}

//Remove instance and stop it if running
func (i *Instance) Remove() error {

	err := i.Stop()
	if err != nil {
		return err
	}

	err = i.store.Delete(i.instance.Name)
	if err != nil {
		return err
	}

	return nil
}

//Stop instance without removing
func (i *Instance) Stop() error {

	log.Debugf("Stopping instance %s", i.instance.Name)

	err := docker.StopContainer(i.instance.Name)
	if err != nil {
		return err
	}

	return nil
}

//GetStatus return the current instance known status
func (i *Instance) GetStatus() *model.Instance {
	return i.instance
}

//Exists check if the instance has been stored
func (i *Instance) Exists() (bool, error) {

	log.Debugf("Check if instance %s exists", i.instance.Name)

	dbInstance := model.Instance{}
	err := i.store.Load(i.instance.Name, dbInstance)
	if err != nil {
		return false, err
	}

	return true, nil
}

//IsRunning check if the instance is running
func (i *Instance) IsRunning() (bool, error) {

	log.Debugf("Check if instance %s is running", i.instance.Name)

	info, err := docker.GetContainer(i.instance.Name)
	if err != nil {
		return false, err
	}

	return info.ContainerJSONBase != nil, nil
}

//Restart instance
func (i *Instance) Restart() error {
	i.Stop()
	return i.Start()
}
