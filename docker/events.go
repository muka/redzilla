package docker

import (
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/muka/redzilla/model"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

//ContainerEvent store a container event
type ContainerEvent struct {
	ID      string
	Name    string
	Action  string
	Message events.Message
}

var eventsChannel = make(chan *ContainerEvent)

//GetEventsChannel return the main channel reporting docker events
func GetEventsChannel() chan *ContainerEvent {
	return eventsChannel
}

// ListenEvents watches docker events an handle state modifications
func ListenEvents(cfg *model.Config) chan *ContainerEvent {

	cli, err := getClient()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	// ctx1 := context.Background()
	// ctx, cancel := context.WithCancel(ctx1)

	f := filters.NewArgs()
	f.Add("label", "redzilla=1")
	// <-chan events.Message, <-chan error
	msgChan, errChan := cli.Events(ctx, types.EventsOptions{
		Filters: f,
	})

	go func() {
		for {
			select {
			case event := <-msgChan:
				if &event != nil {

					logrus.Infof("Event recieved: %s %s ", event.Action, event.Type)
					if event.Actor.Attributes != nil {

						// logrus.Infof("%s: %s | %s | %s | %s | %s", event.Actor.Attributes["name"], event.Action, event.From, event.ID, event.Status, event.Type)

						name := event.Actor.Attributes["name"]
						switch event.Action {
						case "start":
							logrus.Debugf("Container started %s", name)
							break
						case "die":
							logrus.Debugf("Container exited %s", name)
							break
						}

						ev := &ContainerEvent{
							Action:  event.Action,
							ID:      event.ID,
							Name:    name,
							Message: event,
						}
						eventsChannel <- ev

					}
				}
			case err := <-errChan:
				if err != nil {
					logrus.Errorf("Error event recieved: %s", err.Error())
				}
			}
		}
	}()

	return eventsChannel
}
