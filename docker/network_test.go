package docker

import (
	"testing"
)

func TestGetNetwork(t *testing.T) {

	networkID := "test_redzilla1"

	removeNetwork(networkID)

	_, err := GetNetwork(networkID)
	if err != nil {
		t.Fatal(err)
	}

	err = removeNetwork(networkID)
	if err != nil {
		t.Fatal(err)
	}

}
