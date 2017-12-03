package model

// Config stores settings for the appliance
type Config struct {
	Network          string `yaml:"network"`
	APIPort          string `yaml:"api_port"`
	Domain           string `yaml:"domain"`
	ImageName        string `yaml:"image_name"`
	StorePath        string `yaml:"store_path"`
	InstanceDataPath string `yaml:"instance_data_path"`
	LogLevel         string `yaml:"log_level"`
}
