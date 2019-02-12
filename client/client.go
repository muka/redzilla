package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"strings"

	httpclient "github.com/ddliu/go-httpclient"
	"github.com/sirupsen/logrus"
)

func NewClient(opts ClientOptions) (*Client, error) {

	c := new(Client)
	c.options = opts

	m := httpclient.Map{
		httpclient.OPT_USERAGENT: "go-nodered-client",
		"Node-RED-API-Version":   "v2",
	}

	if opts.Authorization != "" {
		m["Authorization"] = "Bearer " + opts.Authorization
	}

	c.client = httpclient.NewHttpClient().Defaults(m)
	return c, nil
}

type ClientOptions struct {
	BaseUrl       string
	Authorization string
}

type Client struct {
	options ClientOptions
	client  *httpclient.HttpClient
}

func (c *Client) req(method, path string, body []byte) ([]byte, error) {

	url := c.options.BaseUrl + path
	headers := map[string]string{}
	r, err := c.client.Begin().Do(method, url, headers, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	res, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	return res, nil
}

// AuthLoginGet Get the active authentication scheme
func (c *Client) AuthLoginGet() (*AuthScheme, error) {
	res, err := c.req("GET", "/auth/login", nil)
	if err != nil {
		return nil, err
	}

	r := new(AuthScheme)
	err = json.Unmarshal(res, r)
	if err != nil {
		return nil, err
	}

	return r, nil
}

// AuthToken Exchange credentials for access token
func (c *Client) AuthToken(authToken AuthTokenRequest) (*AuthToken, error) {

	body, err := json.Marshal(authToken)
	if err != nil {
		return nil, err
	}

	res, err := c.req("POST", "/auth/token", body)
	logrus.Debug()

	// Error - Cannot POST /auth/token
	if strings.Contains(string(res), "Error") {
		return nil, errors.New("Request failed")
	}

	if err != nil {
		return nil, err
	}

	r := new(AuthToken)
	err = json.Unmarshal(res, r)
	if err != nil {
		return nil, err
	}

	return r, nil
}

// AuthTokenRevoke Revoke an access token
func (c *Client) AuthTokenRevoke() error {
	_, err := c.req("POST", "/auth/revoke", nil)
	return err
}

// Settings Get the runtime settings
func (c *Client) Settings() error {
	_, err := c.req("GET", "/settings", nil)
	return err
}

// FlowsList Get the active flow configuration
func (c *Client) FlowsList() (*FlowsList, error) {
	res, err := c.req("GET", "/flows", nil)
	if err != nil {
		return nil, err
	}

	list := new(FlowsList)
	err = json.Unmarshal(res, list)
	if err != nil {
		return nil, err
	}

	return list, nil
}

// FlowsSet	Set the active flow configuration
func (c *Client) FlowsSet() error {
	_, err := c.req("POST", "/flows", nil)
	return err
}

// FlowsAdd Add a flow to the active configuration
func (c *Client) FlowsAdd() error {
	_, err := c.req("POST", "/flow", nil)
	return err
}

// FlowsGet Get an individual flow configuration
func (c *Client) FlowsGet(id string) error {
	_, err := c.req("GET", fmt.Sprintf("/flow/%s", id), nil)
	return err
}

// UpdateFlow Update an individual flow configuration
func (c *Client) FlowsUpdate(id string) error {
	_, err := c.req("PUT", fmt.Sprintf("/flow/%s", id), nil)
	return err
}

// DeleteFlow Delete an individual flow configuration
func (c *Client) FlowsDelete(id string) error {
	_, err := c.req("DELETE", fmt.Sprintf("/flow/%s", id), nil)
	return err
}

// NodesList	Get a list of the installed nodes
func (c *Client) NodesList() error {
	c.req("GET", "/nodes", nil)
	return nil
}

// NodesAdd Install a new node module
func (c *Client) NodesAdd() error {
	c.req("POST", "/nodes", nil)
	return nil
}

// NodesGet Get a node module’s information
func (c *Client) NodesGet(module string) error {
	c.req("GET", fmt.Sprintf("/nodes/%s", module), nil)
	return nil
}

// Enable/Disable a node module
func (c *Client) NodesToggle(module string) error {
	c.req("PUT", fmt.Sprintf("/nodes/%s", module), nil)
	return nil
}

// NodesRemove Remove a node module
func (c *Client) NodesRemove(module string) error {
	c.req("DELETE", fmt.Sprintf("/nodes/%s", module), nil)
	return nil
}

// NodesModuleSetGet Get a node module set information
func (c *Client) NodesModuleSetGet(module, set string) error {
	c.req("GET", fmt.Sprintf("/nodes/%s/%s", module, set), nil)
	return nil
}

// NodesModuleSetToggle Enable/Disable a node set
func (c *Client) NodesModuleSetToggle(module, set string) error {
	c.req("PUT", fmt.Sprintf("/nodes/%s/%s", module, set), nil)
	return nil
}
