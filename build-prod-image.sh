#! /usr/bin/env bash

docker build -t simulator-prod .
docker run -it --rm -d -p 5000:80 --name web simulator-prod
