#!/bin/bash

docker build --no-cache -t homeserver-image-clean-dev .
docker run -p 3000:3000 homeserver-image-clean-dev
