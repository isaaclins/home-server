#!/bin/bash

#first, start docker daemon
open -a Docker && while ! docker info > /dev/null 2>&1; do sleep 1; done


# First, delete the container if it exists
docker rm -f home-server 2>/dev/null

# Then, build the image
docker build -t home-server .

# Then, run the container
docker run -it -p 8000:8000 home-server
