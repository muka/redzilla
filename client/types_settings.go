package client

// https://nodered.org/docs/api/admin/methods/get/settings/

type SettingsUser struct {
	Username    string
	Permissions string
}

type Settings struct {
	HttpNodeRoot string       `json:"http_node_root"`
	Version      string       `json:"version"`
	User         SettingsUser `json:"user"`
}
