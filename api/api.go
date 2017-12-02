package api

import (
	"net/http"

	"github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
)

//NodeRedPort default internal node red port
const NodeRedPort = "1880"

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

//Start start API HTTP server
func Start(cfg *model.Config) error {

	router := gin.Default()

	v2 := router.Group("/v2", func(c *gin.Context) {

		// handle only on main domain
		if c.Request.Host == cfg.Domain {
			c.Next()
			return
		}

		// handle with proxy
		c.Abort()
	})

	v2.GET("/instances", func(c *gin.Context) {
		list, err := ListInstances(cfg)
		if err != nil {
			internalError(c, err)
			return
		}
		c.JSON(http.StatusOK, list)
	})

	v2.Any("/instances/:name", func(c *gin.Context) {

		name := c.Param("name")

		instance := GetInstance(name, cfg)
		if instance == nil {
			notFound(c)
			return
		}

		switch c.Request.Method {
		case http.MethodGet:
			logrus.Debugf("Load instance %s", name)

			if !instanceExists(c, instance) {
				return
			}

			c.Status(http.StatusOK)

			break
		case http.MethodPost:
			logrus.Debugf("Start instance %s", name)

			err := instance.Start()
			if err != nil {
				internalError(c, err)
				return
			}

			c.Status(http.StatusAccepted)

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

			c.Status(http.StatusAccepted)

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
		}

	})

	// reverse proxy
	router.Use(proxyHandler(cfg))

	logrus.Infof("Starting API at %s", cfg.APIPort)
	return router.Run(cfg.APIPort)
}
