FROM scratch
ENV GIN_MODE=release
COPY ./redzilla /redzilla
ENTRYPOINT [ "/redzilla" ]
