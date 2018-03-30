#!/bin/bash
docker run -v /$(pwd):/code -p 5000:5000 --rm -it pie-bot-simulator bash -i
