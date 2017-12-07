package api

import (
	"context"
	"encoding/json"
	"os"

	"github.com/Sirupsen/logrus"
	"github.com/muka/redzilla/docker"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/storage"
)

const instanceCollection = "instances"

var instancesCache = make(map[string]*Instance)

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

	logrus.Debugf("Found %d instances", len(list))
	return &list, err
}

// GetInstance return a instance from the cache if available
func GetInstance(name string, cfg *model.Config) *Instance {
	if _, ok := instancesCache[name]; !ok {
		instancesCache[name] = NewInstance(name, cfg)
	}
	return instancesCache[name]
}

// NewInstance new instance api
func NewInstance(name string, cfg *model.Config) *Instance {

	datadir := storage.GetInstancesDataPath(name, cfg)
	storage.CreateDir(datadir)

	instanceLogger, err := NewInstanceLogger(name, datadir)
	if err != nil {
		logrus.Errorf("Failed to initialize instance %s logger at %s", name, datadir)
		panic(err)
	}

	i := Instance{
		instance:   model.NewInstance(name),
		cfg:        cfg,
		store:      storage.GetStore(instanceCollection, cfg),
		logger:     instanceLogger,
		logContext: NewInstanceContext(),
	}

	// TODO add support to port mapping (eg. MQTT)
	i.instance.Port = NodeRedPort

	return &i
}

//NewInstanceContext craeate a new instance context
func NewInstanceContext() *InstanceContext {
	ctx, cancel := context.WithCancel(context.Background())
	return &InstanceContext{
		context: ctx,
		cancel:  cancel,
	}
}

//InstanceContext tracks internal context for the instance
type InstanceContext struct {
	context context.Context
	cancel  context.CancelFunc
}

//Cancel the instance level context
func (c *InstanceContext) Cancel() {
	c.cancel()
}

//GetContext return the real context reference
func (c *InstanceContext) GetContext() context.Context {
	return c.context
}

//Instance API
type Instance struct {
	instance   *model.Instance
	cfg        *model.Config
	store      *storage.Store
	logger     *InstanceLogger
	logContext *InstanceContext
}

//Save instance status
func (i *Instance) Save() error {

	logrus.Debugf("Saving instance state %s", i.instance.Name)

	err := i.store.Save(i.instance.Name, i.instance)
	if err != nil {
		return err
	}

	return nil
}

//Create instance without starting
func (i *Instance) Create() error {

	logrus.Debugf("Creating instance %s", i.instance.Name)

	err := i.Save()
	if err != nil {
		return err
	}

	return nil
}

//Start an instance creating a record for if it does not exists
func (i *Instance) Start() error {

	logrus.Debugf("Starting instance %s", i.instance.Name)

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

	logrus.Debugf("Stopping instance %s", i.instance.Name)

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

	logrus.Debugf("Check if instance %s exists", i.instance.Name)

	dbInstance := model.Instance{}
	err := i.store.Load(i.instance.Name, dbInstance)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

//IsRunning check if the instance is running
func (i *Instance) IsRunning() (bool, error) {

	if i.instance.Status == model.InstanceStarted {
		return true, nil
	}

	info, err := docker.GetContainer(i.instance.Name)
	if err != nil {
		return false, err
	}

	running := info.ContainerJSONBase != nil
	if running {
		i.instance.Status = model.InstanceStarted
	} else {
		i.instance.Status = model.InstanceStopped
	}

	return running, nil
}

//Restart instance
func (i *Instance) Restart() error {
	i.Stop()
	return i.Start()
}

//GetLogger Return the dedicated logger
func (i *Instance) GetLogger() *logrus.Logger {
	return i.logger.GetLogger()
}
