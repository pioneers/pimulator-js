# Begin with the latest nginx image
FROM nginx:latest

MAINTAINER Charles Hong <charleshong@pioneers.berkeley.edu>

# Create the expected file structure in the image
COPY templates/index.html /usr/share/nginx/html/index.html
COPY static /usr/share/nginx/html/static

# docker build -t webserver .
# docker run -it --rm -d -p 8080:80 --name web webserver
# Navigate to localhost:8080
