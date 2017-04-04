package model

// Config stores settings for the appliance
type Config struct {
	APIPort     string
	TraefikHost string
	ImageName   string
	StorePath   string
}

//NewDefaultConfig return a default configuration good for all season
func NewDefaultConfig() *Config {
	return &Config{
		APIPort:   ":3000",
		ImageName: "nodered/node-red-docker",
		StorePath: "./data/store",
	}
}
