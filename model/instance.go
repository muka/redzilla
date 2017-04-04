package model

import "time"

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
	Created time.Time
}

//Instances a list of Instance
type Instances []Instance
