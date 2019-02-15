package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	httpclient "github.com/ddliu/go-httpclient"
	"github.com/muka/redzilla/config"
	"github.com/muka/redzilla/model"
	"github.com/stretchr/testify/assert"
)

func TestAPI(t *testing.T) {

	err := config.Init()
	assert.NoError(t, err)

	cfg, err := config.GetApiConfig()
	assert.NoError(t, err)

	cfg.APIPort = ":50015"
	cfg.Autostart = true
	cfg.StorePath = "../test/data/store"
	cfg.InstanceDataPath = "../test/data/instances"
	cfg.InstanceConfigPath = "../test/data/config"

	defer CloseInstanceLoggers()

	go func() {
		err = Start(cfg)
		assert.NoError(t, err)
	}()

	baseUrl := fmt.Sprintf("http://%s%s/v2/instances", cfg.Domain, cfg.APIPort)
	res, err := httpclient.PostJson(baseUrl+"/test1", nil)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)

	b, err := res.ReadAll()
	assert.NoError(t, err)

	instance := new(model.Instance)
	err = json.Unmarshal(b, instance)
	assert.NoError(t, err)

	assert.NotEmpty(t, instance.Name)
	assert.NotEmpty(t, instance.IP)

	_, err = httpclient.Delete(baseUrl + "/test1")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)

	res, err = httpclient.Get(baseUrl)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)

	b, err = res.ReadAll()
	assert.NoError(t, err)

	instances := make([]model.Instance, 0)
	err = json.Unmarshal(b, &instances)
	assert.NoError(t, err)

}
