#!/bin/bash

SLEEP_INTERVAL="${SLEEP_INTERVAL:-10}"

trap "exit" SIGINT
mkdir /var/htdocs
while :
do
echo $(date) Writing fortune to /var/htdocs/index.html;
/usr/games/fortune > /var/htdocs/index.html
sleep $SLEEP_INTERVAL
done
