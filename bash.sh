#!/bin/bash
docker run -v /$(pwd):/code -p 5000:5000 --rm -it web-server bash -i
