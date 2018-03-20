#!/bin/bash
docker run -p 5000:5000 -v /$(pwd):/code web-server
