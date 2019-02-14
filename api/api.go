package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
)

//NodeRedPort default internal node red port
const NodeRedPort = "1880"

//Start start API HTTP server
func Start(cfg *model.Config) error {

	router := gin.Default()

	if len(cfg.AuthType) > 0 && cfg.AuthType != "none" {
		router.Use(AuthHandler(cfg))
	}

	router.Any("/v2/instances/:name", func(c *gin.Context) {

		if !isRootDomain(c.Request.Host, cfg.Domain) {
			c.Next()
			return
		}

		logrus.Debugf("Api call %s %s", c.Request.Method, c.Request.URL.Path)

		name, err := validateName(c.Param("name"))
		if err != nil {
			c.AbortWithError(http.StatusBadRequest, err)
			return
		}

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

		if !isRootDomain(c.Request.Host, cfg.Domain) {
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
