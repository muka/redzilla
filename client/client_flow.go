package client

import (
	"encoding/json"
	"errors"
	"fmt"
)

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

func (c *Client) FlowsSet(flows FlowsList) (*FlowsRev, error) {
	return c.FlowsSetWithType(FlowsDeploymentTypeDefault, flows)
}

// FlowsSet	Set the active flow configuration
func (c *Client) FlowsSetWithType(deploymentType FlowsDeploymentType, flows FlowsList) (*FlowsRev, error) {

	b, err := json.Marshal(flows)
	if err != nil {
		return nil, err
	}

	res, err := c.reqWithHeaders("POST", "/flows", b, map[string]string{
		"Node-RED-Deployment-Type": string(deploymentType),
	})
	if err != nil {
		return nil, err
	}

	rev := new(FlowsRev)
	err = json.Unmarshal(res, rev)
	if err != nil {
		return nil, err
	}

	return rev, nil
}

// FlowsAdd Add a flow to the active configuration
func (c *Client) FlowAdd(flow *FlowConfig) (*Flow, error) {

	b, err := json.Marshal(flow)
	if err != nil {
		return nil, err
	}

	res, err := c.req("POST", "/flow", b)

	r := new(Flow)
	err = json.Unmarshal(res, r)
	if err != nil {
		return nil, err
	}

	return r, nil
}

// FlowsGet Get an individual flow configuration
func (c *Client) FlowGet(id string) (*FlowConfig, error) {
	b, err := c.req("GET", fmt.Sprintf("/flow/%s", id), nil)
	if err != nil {
		return nil, err
	}
	r := new(FlowConfig)
	err = json.Unmarshal(b, r)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// FlowGetGlobal return the global flow config
func (c *Client) FlowGetGlobal() (*FlowConfig, error) {
	return c.FlowGet("global")
}

// UpdateFlow Update an individual flow configuration
func (c *Client) FlowUpdate(flow *FlowConfig) (*Flow, error) {

	if flow.Id == "" {
		return nil, errors.New("Id must be provided")
	}

	d, err := json.Marshal(flow)
	if err != nil {
		return nil, err
	}

	b, err := c.req("PUT", fmt.Sprintf("/flow/%s", flow.Id), d)
	if err != nil {
		return nil, err
	}

	r := new(Flow)
	err = json.Unmarshal(b, r)
	if err != nil {
		return nil, err
	}

	return r, nil
}

// DeleteFlow Delete an individual flow configuration
func (c *Client) FlowsDelete(id string) error {
	_, err := c.req("DELETE", fmt.Sprintf("/flow/%s", id), nil)
	return err
}
