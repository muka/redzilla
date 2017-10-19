
clean:
	rm -f redzilla

build:
	CGO_ENABLED=0 go build -a -ldflags '-s' -o redzilla

docker/build:
	docker build . -t opny/redzilla

docker/push: docker/build
	docker push -t opny/redzilla
