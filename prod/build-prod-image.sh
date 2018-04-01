#!/bin/bash

# Get the Google Cloud Project ID
export PROJECT_ID="$(gcloud config get-value project -q)"

# Create the image name
export DOCKER_IMAGE_NAME="gcr.io/${PROJECT_ID}/pie-bot-simulator"

# Build the actual image - see the other start.sh for info on the arguments
docker build --file Dockerfile -t ${DOCKER_IMAGE_NAME} ../

gcloud docker -- push ${DOCKER_IMAGE_NAME}

