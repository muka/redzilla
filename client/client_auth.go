package client

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/sirupsen/logrus"
)

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
func (c *Client) AuthTokenRevoke(token string) error {
	r := new(AuthRevoke)
	r.Token = token
	b, err := json.Marshal(r)
	if err != nil {
		return err
	}
	_, err = c.req("POST", "/auth/revoke", b)
	if err != nil {
		return err
	}
	return nil
}

// Settings Get the runtime settings
func (c *Client) Settings() (*Settings, error) {
	res, err := c.req("GET", "/settings", nil)
	if err != nil {
		return nil, err
	}
	r := new(Settings)
	err = json.Unmarshal(res, r)
	if err != nil {
		return nil, err
	}
	return r, err
}
