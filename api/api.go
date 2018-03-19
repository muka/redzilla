package api

import (
	"net/http"
	"strings"

	"github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
)

//NodeRedPort default internal node red port
const NodeRedPort = "1880"

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

func isSubdomain(c *gin.Context, cfg *model.Config) bool {
	host := c.Request.Host
	portIdx := strings.Index(c.Request.Host, ":")
	if portIdx > -1 {
		host = c.Request.Host[0:portIdx]
	}
	// handle only on main domain
	subdIndex := strings.Index(host, ".")
	if subdIndex > -1 {
		return host[subdIndex+1:] == cfg.Domain
	}
	return false
}

func isRootDomain(c *gin.Context, cfg *model.Config) bool {
	host := c.Request.Host
	portIdx := strings.Index(c.Request.Host, ":")
	if portIdx > -1 {
		host = c.Request.Host[0:portIdx]
	}
	// handle only on main domain
	return host == cfg.Domain
}

//Start start API HTTP server
func Start(cfg *model.Config) error {

	router := gin.Default()
	router.Any("/v2/instances/:name", func(c *gin.Context) {

		if !isRootDomain(c, cfg) {
			c.Next()
			return
		}

		logrus.Debugf("Api call %s %s", c.Request.Method, c.Request.URL.Path)

		name := c.Param("name")
		instance := GetInstance(name, cfg)
		if instance == nil {
			notFound(c)
			return
		}

		logrus.Debugf("Got %s %s", c.Request.Method, name)

		switch c.Request.Method {
		case http.MethodGet:
			logrus.Debugf("Load instance %s", name)

			if !instanceExists(c, instance) {
				return
			}

			c.JSON(http.StatusOK, instance.GetStatus())

			break
		case http.MethodPost:

			logrus.Debugf("Start instance %s", name)

			err := instance.Start()
			if err != nil {
				internalError(c, err)
				return
			}

			c.JSON(http.StatusOK, instance.GetStatus())

			break
		case http.MethodPut:
			logrus.Debugf("Restart instance %s", name)

			if !instanceExists(c, instance) {
				return
			}

			err := instance.Restart()
			if err != nil {
				internalError(c, err)
				return
			}

			c.JSON(http.StatusOK, instance.GetStatus())

			break
		case http.MethodDelete:
			logrus.Debugf("Stop instance %s", name)

			if !instanceExists(c, instance) {
				return
			}

			err := instance.Stop()
			if err != nil {
				errorResponse(c, http.StatusInternalServerError, err.Error())
				return
			}

			c.Status(http.StatusAccepted)

			break
		default:
			badRequest(c)
			break
		}

	})

	router.GET("/v2/instances", func(c *gin.Context) {

		if !isRootDomain(c, cfg) {
			c.Next()
			return
		}

		logrus.Debug("List instances")
		list, err := ListInstances(cfg)
		if err != nil {
			internalError(c, err)
			return
		}

		c.JSON(http.StatusOK, list)
	})

	// reverse proxy
	router.Use(proxyHandler(cfg))

	logrus.Infof("Starting API at %s", cfg.APIPort)
	return router.Run(cfg.APIPort)
}
