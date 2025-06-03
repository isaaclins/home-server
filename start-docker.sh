#!/bin/bash

docker build -t homeserver-image-clean-dev .
docker run -p 3000:3000 homeserver-image-clean-dev
