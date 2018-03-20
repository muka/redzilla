package api

import (
	"testing"
)

func TestIsRootDomain(t *testing.T) {
	const testDomain = "example.localhost"
	const testSubDomain = "foobar." + testDomain
	if !isRootDomain(testDomain, testDomain) {
		t.Fail()
	}
	if isRootDomain(testSubDomain, testDomain) {
		t.Fail()
	}
}

func TestIsSubdomain(t *testing.T) {
	const testDomain = "example.localhost"
	const testSubDomain = "foobar." + testDomain
	if isSubdomain(testDomain, testDomain) {
		t.Fail()
	}
	if !isSubdomain(testSubDomain, testDomain) {
		t.Fail()
	}
}

func TestValidateName(t *testing.T) {
	const testSubDomain = "foobar"
	const testInvalidSubDomain = "foobar.juju"

	var err error

	_, err = validateName(testSubDomain)
	if err != nil {
		t.Fatal(err)
	}

	_, err = validateName(testInvalidSubDomain)
	if err == nil {
		t.Fail()
	}

}
