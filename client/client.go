package client

import (
	"bytes"
	"fmt"
	"io/ioutil"

	httpclient "github.com/ddliu/go-httpclient"
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
	return c.reqWithHeaders(method, path, body, map[string]string{})
}

func (c *Client) reqWithHeaders(method, path string, body []byte, addonHeaders map[string]string) ([]byte, error) {

	url := c.options.BaseUrl + path

	headers := map[string]string{
		"Content-type": "application/json",
	}
	if len(addonHeaders) > 0 {
		for k, v := range addonHeaders {
			headers[k] = v
		}
	}

	r, err := c.client.Begin().Do(method, url, headers, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if r.StatusCode >= 400 {
		return nil, fmt.Errorf("Request failed with %s", r.Status)
	}
	res, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	return res, nil
}
