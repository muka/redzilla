package model

import "html/template"

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
	AuthType           string
	AuthHttp           *AuthHttp
}

type AuthHttp struct {
	Method string
	URL    string
	Header string
	Body   *template.Template
}
