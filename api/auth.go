package api

import (
	"bytes"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
)

//RequestBodyTemplate contains params avail in the body template
type RequestBodyTemplate struct {
	Url       string
	Method    string
	Name      string
	HeaderKey string
	HeaderVal string
}

// AuthHandler handle authentication and authorization
func AuthHandler(cfg *model.Config) func(c *gin.Context) {
	return func(c *gin.Context) {

		switch strings.ToLower(cfg.AuthType) {
		case "http":

			reqArgs := new(RequestBodyTemplate)
			reqArgs.Url = c.Request.URL.String()
			reqArgs.Method = c.Request.Method
			reqArgs.Name = c.Param("name")
			reqArgs.HeaderKey = cfg.AuthHttp.Header
			reqArgs.HeaderVal = c.Request.Header.Get(cfg.AuthHttp.Header)

			res, err := doRequest(reqArgs, cfg.AuthHttp)
			if err != nil {
				c.AbortWithStatus(http.StatusInternalServerError)
				return
			}

			if res {
				c.Next()
				return
			}

			c.AbortWithStatus(401)

			break
		case "none":
		case "":
			//no auth, go on
		}
	}
}

func doRequest(reqArgs *RequestBodyTemplate, a *model.AuthHttp) (bool, error) {

	url := a.URL
	method := strings.ToUpper(a.Method)
	bodyTemplate := a.Body

	var body bytes.Buffer

	err := bodyTemplate.Execute(&body, reqArgs)
	if err != nil {
		logrus.Warnf("Template execution failed: %s", err)
		return false, err
	}

	client := new(http.Client)
	client.Timeout = time.Duration(2 * time.Second)
	req, err := http.NewRequest(method, url, &body)
	if err != nil {
		logrus.Warnf("Auth request creation failed: %s", err)
		return false, err
	}

	req.Header.Add(reqArgs.HeaderKey, reqArgs.HeaderVal)
	resp, err := client.Do(req)
	if err != nil {
		logrus.Warnf("Auth request creation failed: %s", err)
		return false, err
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return true, nil
	}
	if resp.StatusCode >= 500 {
		logrus.Warnf("Auth request failed with code %s", resp.StatusCode)
		body, err := ioutil.ReadAll(resp.Body)
		if err == nil {
			logrus.Warnf("Response body: %s", string(body))
		}
		return false, err
	}

	logrus.Debugf("Request unauthorized %s %s [response code: %d]", reqArgs.Method, reqArgs.Url, resp.StatusCode)
	return false, nil
}
