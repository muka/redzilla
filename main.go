package main

import (
	"fmt"
	"os"

	"github.com/Sirupsen/logrus"
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
	viper.SetDefault("LogLevel", "info")

	viper.SetEnvPrefix("redzilla")
	viper.AutomaticEnv()

	if os.Getenv("CONFIG") != "" {
		viper.AddConfigPath(os.Getenv("CONFIG"))
	} else {
		if _, err := os.Stat("./config.yml"); !os.IsNotExist(err) {
			viper.SetConfigName("config")
			viper.AddConfigPath(".")
		}
	}

	err := viper.ReadInConfig()
	if err != nil {
		panic(fmt.Errorf("Failed to read from config file: %s", err))
	}

	cfg := &model.Config{
		Network:          viper.GetString("Network"),
		APIPort:          viper.GetString("APIPort"),
		Domain:           viper.GetString("Domain"),
		ImageName:        viper.GetString("ImageName"),
		StorePath:        viper.GetString("StorePath"),
		InstanceDataPath: viper.GetString("InstanceDataPath"),
		LogLevel:         viper.GetString("LogLevel"),
	}

	lvl, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		panic(fmt.Errorf("Failed to parse level %s: %s", cfg.LogLevel, err))
	}
	logrus.SetLevel(lvl)

	defer service.Stop(cfg)

	err = service.Start(cfg)
	if err != nil {
		logrus.Errorf("Error: %s", err.Error())
		panic(err)
	}

}
