
TAG := $(shell git describe --tags | grep "^[v0-9.]*" -o)

run:
	go run main.go

clean:
	rm -f redzilla

build:
	CGO_ENABLED=0 go build -a -ldflags '-s' -o redzilla

docker/build: build
	docker build . -t opny/redzilla:$(TAG)
	docker tag opny/redzilla:$(TAG) opny/redzilla:latest

docker/push:
	docker push opny/redzilla:$(TAG)
	docker push opny/redzilla:latest

docker/release: docker/build docker/push
