package client

import "fmt"

func NewClient(opts ClientOptions) (*Client, error) {
	c := new(Client)
	c.options = opts
	return c, nil
}

type ClientOptions struct {
}

type Client struct {
	options ClientOptions
}

func (c *Client) req(method, url string, data []byte) ([]byte, error) {
	return []byte{}, nil
}

// GetAuthLogin Get the active authentication scheme
func (c *Client) GetAuthLogin() error {
	res, err := c.req("GET", "/auth/login")
	return err
}

// AuthToken Exchange credentials for access token
func (c *Client) AuthToken() error {
	res, err := c.req("POST", "/auth/token")
	return err
}

// AuthRevokeToken Revoke an access token
func (c *Client) AuthRevokeToken() error {
	res, err := c.req("POST", "/auth/revoke")
	return err
}

// Settings Get the runtime settings
func (c *Client) Settings() error {
	res, err := c.req("GET", "/settings")
	return err
}

// FlowsGet Get the active flow configuration
func (c *Client) FlowsGet() error {
	_, err := c.req("GET", "/flows", nil)
	return err
}

// FlowsSet	Set the active flow configuration
func (c *Client) FlowsSet() error {
	_, err := c.req("POST", "/flows", nil)
	return nil
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

// NodesGet	Get a list of the installed nodes
func (c *Client) NodesGet() error {
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
	c.req("DELETE", fmt.Sprintf("/nodes/%s", module))
	return nil
}

// NodesModuleSetGet Get a node module set information
func (c *Client) NodesModuleSetGet(module, set string) error {
	c.req("GET", fmt.Sprintf("/nodes/%s/%s", module, set))
	return nil
}

// NodesModuleSetToggle Enable/Disable a node set
func (c *Client) NodesModuleSetToggle(module, set string) error {
	c.req("PUT", fmt.Sprintf("/nodes/%s/%s", module, set))
	return nil
}
