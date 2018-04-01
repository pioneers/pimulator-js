#!/bin/bash

export PROJECT_ID="$(gcloud config get-value project -q)"
export DOCKER_IMAGE_NAME="gcr.io/${PROJECT_ID}/pie-bot-simulator"
docker run -p 5000:5000 --rm ${DOCKER_IMAGE_NAME}

# Create a new container running the web-server image

# Breaking down the command

# Run within docker
# docker run

# Map the containers port 5000 to the local port 5000
# -p 5000:5000

# Delete the container after use to make clean up easier
# --rm

# Use the image web-server
# pie-bot-simulator
