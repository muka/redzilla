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
	viper.SetDefault("InstanceConfigPath", "./data/config")
	viper.SetDefault("LogLevel", "info")
	viper.SetDefault("Autostart", false)
	viper.SetDefault("EnvPrefix", "")

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
	}

	lvl, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		panic(fmt.Errorf("Failed to parse level %s: %s", cfg.LogLevel, err))
	}
	logrus.SetLevel(lvl)

	logrus.Debugf("%++v", cfg)

	defer service.Stop(cfg)

	err = service.Start(cfg)
	if err != nil {
		logrus.Errorf("Error: %s", err.Error())
		panic(err)
	}

}
