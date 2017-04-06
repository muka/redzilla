
clean:
	rm -f redzilla

build:
	CGO_ENABLED=0 go build -a -ldflags '-s' -o redzilla

dockerize:
	docker build . -t opny/redzilla

push: docker
	docker push -t opny/redzilla
