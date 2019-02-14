package api

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
)

// JSONError a JSON response in case of error
type JSONError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// errorResponse send an error response with a common JSON message
func errorResponse(c *gin.Context, code int, message string) {
	c.JSON(code, JSONError{code, message})
}

func internalError(c *gin.Context, err error) {
	logrus.Errorf("Internal Error: %s", err.Error())
	logrus.Debugf("%+v", err)
	code := http.StatusInternalServerError
	errorResponse(c, code, http.StatusText(code))
}

func notFound(c *gin.Context) {
	code := http.StatusNotFound
	errorResponse(c, code, http.StatusText(code))
}

func badRequest(c *gin.Context) {
	code := http.StatusNotFound
	errorResponse(c, code, http.StatusText(code))
}

func extractSubdomain(host string, cfg *model.Config) string {
	if len(host) == 0 {
		return ""
	}
	hostname := host[:strings.Index(host, ":")]
	name := strings.Replace(hostname, "."+cfg.Domain, "", -1)
	return name
}

func instanceExists(c *gin.Context, instance *Instance) bool {

	exists, err := instance.Exists()
	if err != nil {
		internalError(c, err)
		return false
	}

	if !exists {
		notFound(c)
		return false
	}

	return true
}

func isSubdomain(host, domain string) bool {
	portIdx := strings.Index(host, ":")
	if portIdx > -1 {
		host = host[0:portIdx]
	}
	// handle only on main domain
	subdIndex := strings.Index(host, ".")
	if subdIndex > -1 {
		return host[subdIndex+1:] == domain
	}
	return false
}

func isRootDomain(host, domain string) bool {
	portIdx := strings.Index(host, ":")
	if portIdx > -1 {
		host = host[0:portIdx]
	}
	// handle only on main domain
	return host == domain
}

func validateName(name string) (string, error) {
	re := regexp.MustCompile("[^0-9a-z_-]")
	if len(re.FindStringSubmatch(name)) > 0 {
		return "", errors.New("Invalid instance name")
	}
	return name, nil
}
