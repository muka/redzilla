package main

import (
	"fmt"
	"html/template"
	"os"
	"strings"

	"github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	"github.com/muka/redzilla/model"
	"github.com/muka/redzilla/service"
	"github.com/spf13/viper"
)

func main() {

	viper.SetDefault("Network", "redzilla")
	viper.SetDefault("APIPort", ":3000")
	viper.SetDefault("Domain", "redzilla.localhost")
	viper.SetDefault("ImageName", "nodered/node-red-docker")
	viper.SetDefault("StorePath", "./data/store")
	viper.SetDefault("InstanceDataPath", "./data/instances")
	viper.SetDefault("InstanceConfigPath", "./data/config")
	viper.SetDefault("LogLevel", "info")
	viper.SetDefault("Autostart", false)
	viper.SetDefault("EnvPrefix", "")

	viper.SetDefault("AuthType", "none")
	viper.SetDefault("AuthHttpMethod", "GET")
	viper.SetDefault("AuthHttpUrl", "")
	viper.SetDefault("AuthHttpHeader", "Authorization")

	viper.SetEnvPrefix("redzilla")
	viper.AutomaticEnv()

	configFile := "./config.yml"
	if os.Getenv("REDZILLA_CONFIG") != "" {
		configFile = os.Getenv("REDZILLA_CONFIG")
	}

	if _, err := os.Stat(configFile); !os.IsNotExist(err) {
		viper.SetConfigFile(configFile)
		err := viper.ReadInConfig()
		if err != nil {
			panic(fmt.Errorf("Failed to read from config file: %s", err))
		}
	}

	cfg := &model.Config{
		Network:            viper.GetString("Network"),
		APIPort:            viper.GetString("APIPort"),
		Domain:             viper.GetString("Domain"),
		ImageName:          viper.GetString("ImageName"),
		StorePath:          viper.GetString("StorePath"),
		InstanceDataPath:   viper.GetString("InstanceDataPath"),
		InstanceConfigPath: viper.GetString("InstanceConfigPath"),
		LogLevel:           viper.GetString("LogLevel"),
		Autostart:          viper.GetBool("Autostart"),
		EnvPrefix:          viper.GetString("EnvPrefix"),
		AuthType:           viper.GetString("AuthType"),
	}

	if strings.ToLower(cfg.AuthType) == "http" {

		a := new(model.AuthHttp)
		a.Method = viper.GetString("AuthHttpMethod")
		a.URL = viper.GetString("AuthHttpUrl")
		a.Header = viper.GetString("AuthHttpHeader")

		//setup the body template
		rawTpl := viper.GetString("AuthHttpHeader")
		if len(rawTpl) > 0 {
			bodyTemplate, err := template.New("").Parse(rawTpl)
			if err != nil {
				panic(fmt.Errorf("Failed to parse template: %s", err))
			}
			a.Body = bodyTemplate
		}

		cfg.AuthHttp = a
	}

	lvl, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		panic(fmt.Errorf("Failed to parse level %s: %s", cfg.LogLevel, err))
	}
	logrus.SetLevel(lvl)

	if lvl != logrus.DebugLevel {
		gin.SetMode(gin.ReleaseMode)
	}

	logrus.Debugf("%++v", cfg)

	defer service.Stop(cfg)

	err = service.Start(cfg)
	if err != nil {
		logrus.Errorf("Error: %s", err.Error())
		panic(err)
	}

}
