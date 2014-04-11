# Latest bulbulator always on:
http://goo.gl/uX2wCq

## How to use it

1. Check out bulbulator.config.sh.sample for ENVs required to run bulbulator
1.1 To use saved config file run `. bulbulator.config.sh && bulbulator.sh [OPTIONS]`
1.2 If you can't or don't want to use file, define them explicitly (hold tight!):
	`MYSQL_USER=dev MYSQL_PASSWORD=dev MYSQL_DB_PREFIX=bulbulator MYSQL_DB_HOST=192.168.1.122 BASE_SETUP_DIR_TO_CHECK=/home/gpawlik/vhosts/ BASE_SETUP_DIR=/home/gpawlik/vhosts/demo1/ MEDIA_DIR=/home/root/mediasync_v2/ ./bulbulator.sh -r Nexway-3.0/ -b bulbulator-split -w eset -e prep -w demo1.gpawlik.nexwai.pl`

with such layout one could have many config files and run 
`. config1.sh && bulbulator ...`


# Ideas for the future

## Make it possible to have config both as param and as envs:

`. eset_demo && bulbulator.sh` would just do the job
but it should be still possible to call
`bulbulator.sh -r -b ...`

## Cache repo
