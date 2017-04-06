package model

import "time"

//InstanceStatus last known state of an instance
type InstanceStatus int

var (
	//InstanceDied not runnig due to failure
	InstanceDied InstanceStatus
	//InstanceStopped stopped by request
	InstanceStopped = 10
	//InstanceStarted started and running
	InstanceStarted = 20
)

//NewInstance return a new json instance
func NewInstance(name string) *Instance {
	return &Instance{
		Name:    name,
		Created: time.Now(),
	}
}

// Instance is a contianer instance
type Instance struct {
	Name    string
	ID      string
	Created time.Time
	Status  InstanceStatus
}
