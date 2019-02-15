package client

// https://nodered.org/docs/api/admin/methods/get/nodes/

type NodeInstall struct {
	Module string
}

type NodeToggle struct {
	Enabled bool
}

type NodeSet struct {
	Id      string
	Name    string
	Types   []string
	Enabled bool
	Module  string
	Version string
}

type NodeModule struct {
	Name    string
	Version string
	Nodes   []NodeSet
}
