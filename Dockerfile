# The build process is split into two steps
# 1. We use a python3 docker image to install jinja-cli to render the index.html
# 2. In an nginx docker image we then copy in all the artifacts for serving. This is what ultimately serves traffic
FROM python:3 AS renderer

RUN pip install --no-cache-dir jinja-cli

WORKDIR /simulator

# Make a copy of the repo so that we can retrieve the most recent git hash
# We then pass this git hash into jinja so we can render the html
COPY . /simulator
RUN GIT_SHA=$(git rev-parse HEAD) && \
    echo "{\"git_hash\": \"$GIT_SHA\"}" > context.json && \
    jinja -d context.json templates/index.html > rendered_index.html


# Template file has already been rendered, so just copy it over
# and host everything using basic nginx
FROM nginx:latest AS serving

MAINTAINER Charles Hong <charleshong@pioneers.berkeley.edu>

# Create the expected file structure in the image
COPY --from=renderer /simulator/rendered_index.html /usr/share/nginx/html/index.html
COPY static /usr/share/nginx/html/static

# docker build -t webserver .
# docker run -it --rm -d -p 8080:80 --name web webserver
# Navigate to localhost:8080
