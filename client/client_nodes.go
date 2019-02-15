package client

import (
	"encoding/json"
	"fmt"
)

// NodesList	Get a list of the installed nodes
func (c *Client) NodesList() ([]NodeSet, error) {

	b, err := c.reqWithHeaders("GET", "/nodes", nil, map[string]string{"Accept": "application/json"})

	r := []NodeSet{}
	err = json.Unmarshal(b, &r)
	if err != nil {
		return nil, err
	}

	return r, nil
}

// NodesAdd Install a new node module
func (c *Client) NodesAdd(module string) (*NodeModule, error) {

	n := NodeInstall{Module: module}
	d, err := json.Marshal(&n)
	if err != nil {
		return nil, err
	}

	b, err := c.req("POST", "/nodes", d)
	if err != nil {
		return nil, err
	}

	i := new(NodeModule)
	err = json.Unmarshal(b, i)
	if err != nil {
		return nil, err
	}

	return i, nil
}

// NodesGet Get a node module’s information
func (c *Client) NodesGet(module string) (*NodeModule, error) {
	b, err := c.req("Get", fmt.Sprintf("/nodes/%s", module), nil)
	if err != nil {
		return nil, err
	}
	r := new(NodeModule)
	err = json.Unmarshal(b, r)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// Enable/Disable a node module
func (c *Client) NodesToggle(module string) (*NodeToggle, error) {
	b, err := c.req("PUT", fmt.Sprintf("/nodes/%s", module), nil)
	if err != nil {
		return nil, err
	}
	r := new(NodeToggle)
	err = json.Unmarshal(b, r)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// NodesRemove Remove a node module
func (c *Client) NodesRemove(module string) error {
	_, err := c.req("DELETE", fmt.Sprintf("/nodes/%s", module), nil)
	if err != nil {
		return err
	}
	return nil
}

// NodesModuleSetGet Get a node module set information
func (c *Client) NodesModuleSetGet(module, set string) (*NodeSet, error) {
	b, err := c.req("GET", fmt.Sprintf("/nodes/%s/%s", module, set), nil)
	if err != nil {
		return nil, err
	}
	n := new(NodeSet)
	err = json.Unmarshal(b, n)
	if err != nil {
		return nil, err
	}
	return n, nil
}

// NodesModuleSetToggle Enable/Disable a node set
func (c *Client) NodesModuleSetToggle(module, set string) (*NodeToggle, error) {
	b, err := c.req("PUT", fmt.Sprintf("/nodes/%s/%s", module, set), nil)
	if err != nil {
		return nil, err
	}
	r := new(NodeToggle)
	err = json.Unmarshal(b, r)
	if err != nil {
		return nil, err
	}
	return r, nil
}
