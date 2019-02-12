package client

type Flow struct {
	Type  string
	Id    string
	Label string
}

type FlowsList struct {
	Rev   string
	Flows []Flow
}
