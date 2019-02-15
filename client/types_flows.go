package client

type FlowsDeploymentType string

const (
	FlowsDeploymentTypeFull    FlowsDeploymentType = "full"
	FlowsDeploymentTypeNodes   FlowsDeploymentType = "nodes"
	FlowsDeploymentTypeFlows   FlowsDeploymentType = "flows"
	FlowsDeploymentTypeReload  FlowsDeploymentType = "reload"
	FlowsDeploymentTypeDefault FlowsDeploymentType = FlowsDeploymentTypeFull
)

type FlowConfig struct {
	Id       string `json:"id,omitempty"`
	Label    string `json:"label,omitempty"`
	Nodes    []string
	Configs  []string     `json:"configs,omitempty"`
	Subflows []FlowConfig `json:"subflows,omitempty"`
}

type Flow struct {
	Type  string `json:"type,omitempty"`
	Id    string `json:"id"`
	Label string `json:"label,omitempty"`
}

type FlowsList struct {
	Rev   string
	Flows []Flow
}

type FlowsRev struct {
	Rev string
}
