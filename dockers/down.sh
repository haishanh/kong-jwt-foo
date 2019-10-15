#!/bin/bash

compose_file=${1:-docker-compose.yml}

cd dockers
docker-compose -f ${compose_file} down
