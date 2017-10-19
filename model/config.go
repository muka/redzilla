package model

import (
	"io/ioutil"
	"os"

	"gopkg.in/yaml.v2"
)

// Config stores settings for the appliance
type Config struct {
	APIPort          string `yaml:"api_port"`
	TraefikHost      string `yaml:"traefik_host"`
	ImageName        string `yaml:"image_name"`
	StorePath        string `yaml:"store_path"`
	InstanceDataPath string `yaml:"instance_data_path"`
}

//NewDefaultConfig return a default configuration good for all season
func NewDefaultConfig() *Config {
	c := &Config{
		APIPort:          ":3000",
		ImageName:        "nodered/node-red-docker",
		StorePath:        "./data/store",
		InstanceDataPath: "./data/instances",
	}
	return c
}

//NewFromFile load config from file
func NewFromFile(filename string) (Config, error) {
	c := Config{}
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return c, err
	}
	err = yaml.Unmarshal([]byte(data), &c)
	return c, err
}

func parseEnv(c *Config) {

	if os.Getenv("PORT") != "" {
		c.APIPort = os.Getenv("PORT")
	}

	if os.Getenv("IMAGE") != "" {
		c.ImageName = os.Getenv("IMAGE")
	}
}
