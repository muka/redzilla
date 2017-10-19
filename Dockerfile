FROM scratch
COPY ./redzilla /redzilla
ENTRYPOINT [ "/redzilla" ]
