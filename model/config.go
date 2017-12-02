package model

import (
	"io/ioutil"
	"os"

	"gopkg.in/yaml.v2"
)

// Config stores settings for the appliance
type Config struct {
	Network          string `yaml:"network"`
	APIPort          string `yaml:"api_port"`
	Domain           string `yaml:"domain"`
	ImageName        string `yaml:"image_name"`
	StorePath        string `yaml:"store_path"`
	InstanceDataPath string `yaml:"instance_data_path"`
}

//NewDefaultConfig return a default configuration good for all season
func NewDefaultConfig() *Config {
	c := &Config{
		Network:          "redzilla",
		APIPort:          ":3000",
		Domain:           "redzilla.localhost",
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
	if os.Getenv("NETWORK") != "" {
		c.Network = os.Getenv("NETWORK")
	}
	if os.Getenv("DOMAIN") != "" {
		c.Domain = os.Getenv("DOMAIN")
	}
}
