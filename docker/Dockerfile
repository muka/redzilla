
FROM ubuntu:trusty

MAINTAINER Luca Capra <luca.capra@gmail.com>

RUN apt-get update -qq
#RUN apt-get upgrade -yq

RUN apt-get install -yqq software-properties-common python-software-properties libicu-dev make g++

RUN add-apt-repository ppa:chris-lea/node.js -y

RUN apt-get update -qq

RUN apt-get install nodejs -yq

RUN apt-get autoremove -yqq
RUN apt-get autoclean -qq

ADD ./node-red /node-red

WORKDIR /node-red

RUN npm i

#VOLUME [ "/user", "/nodes", "/node-red/flow.json", "/node-red/settings.js" ]

EXPOSE 1880