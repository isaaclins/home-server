#!/bin/bash

# First, delete the container if it exists
docker rm -f home-server 2>/dev/null

# Then, build the image
docker build -t home-server .

# Then, run the container
docker run -it -p 8000:8000 home-server
