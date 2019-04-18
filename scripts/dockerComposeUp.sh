#!/bin/bash -e

docker-compose up --force-recreate -d
if [ -z ${NO_LOGS} ]; then
  docker-compose logs -f
fi
