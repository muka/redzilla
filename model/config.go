package model

// Config stores settings for the appliance
type Config struct {
	Network            string
	APIPort            string
	Domain             string
	ImageName          string
	StorePath          string
	InstanceDataPath   string
	InstanceConfigPath string
	LogLevel           string
	Autostart          bool
	EnvPrefix          string
}
