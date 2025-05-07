#!/bin/bash
docker build -t home-server .
docker run -it -p 8000:8000 home-server
