#!/bin/bash

#first, start docker daemon
open -a Docker && while ! docker info > /dev/null 2>&1; do sleep 1; done


# First, delete the container if it exists
docker rm -f home-server 2>/dev/null

# Then, build the image
docker build -t home-server-image .

# Then, run the container
docker run -it -p 3000:3000 -p 3001:3001 home-server-image
