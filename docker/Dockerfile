FROM ubuntu:trusty

MANTAINER Luca Capra <luca.capra@gmail.com>

RUN apt-get update -qq
RUN apt-get upgrade -yq

RUN apt-get install -yqq software-properties-common python-software-properties libicu-dev

RUN add-apt-repository ppa:chris-lea/node.js -y

RUN apt-get update -qq

RUN apt-get install nodejs -yq

RUN apt-get autoremove -yqq
RUN apt-get autoclean -qq



