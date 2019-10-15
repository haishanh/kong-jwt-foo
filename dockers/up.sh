#!/bin/bash

compose_file=${1:-docker-compose.yml}

cd dockers
docker-compose -f ${compose_file} up -d

printf "check if kong is up"

while true; do
  printf "."
  if curl "http://127.0.0.1:8001/consumers" > /dev/null 2>&1; then
    printf "\nit's up!\n\n"
    break
  fi
  sleep 2
done

docker ps
