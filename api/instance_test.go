package api

import (
	"fmt"
	"testing"
	"time"

	"github.com/muka/redzilla/config"
	"github.com/stretchr/testify/assert"
)

func TestInstance(t *testing.T) {

	err := config.Init()
	assert.NoError(t, err)

	cfg, err := config.GetApiConfig()
	assert.NoError(t, err)

	cfg.APIPort = ":50015"
	cfg.Network = "redzilla_test"
	cfg.StorePath = "../test/data/store"
	cfg.InstanceDataPath = "../test/data/instances"
	cfg.InstanceConfigPath = "../test/data/config"

	i := NewInstance(fmt.Sprintf("test_%d", time.Now().Unix()), cfg)

	err = i.Start()
	assert.NoError(t, err)

	ip, err := i.GetIP()
	assert.NoError(t, err)
	assert.NotEmpty(t, ip)

	// err = i.Stop()
	// assert.NoError(t, err)
	//
	// err = i.Remove()
	// assert.NoError(t, err)

}
