#!/bin/bash
docker run -v /$(pwd):/code --rm pie-bot-simulator-dev python3 tests.py 

# This scripts runs the tests within Docker. 
# It's currently too much effort to run this Docker test within Travis
