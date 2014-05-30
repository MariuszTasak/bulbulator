# Latest bulbulator always on:
http://goo.gl/uX2wCq

# How to use it

1. Check out bulbulator.config.sh.sample for ENVs required to run bulbulator
    1. To use saved config file run `. bulbulator.config.sh && bulbulator.sh [OPTIONS]`
    2. If you can't or don't want to use file, define them explicitly (hold tight!):
	`MYSQL_USER=dev MYSQL_PASSWORD=dev MYSQL_DB_PREFIX=bulbulator MYSQL_DB_HOST=192.168.1.122 BASE_SETUP_DIR_TO_CHECK=/home/gpawlik/vhosts/ BASE_SETUP_DIR=/home/gpawlik/vhosts/demo1/ MEDIA_DIR=/home/root/mediasync_v2/ ./bulbulator.sh -r Nexway-3.0/ -b bulbulator-split -w eset -e prep -w demo1.gpawlik.nexwai.pl`

with such layout one could have many config files and run 
`. config1.sh && bulbulator ...`

# Stored configs
To make your life easier you may store configs in the repo:

    configs/
        server_name/
            whatever_layout_fits_your_server

especially put your name (eg. `gpawlik`) as server name to keep your local configs.

Please note this is not safe, so don't put there any password you don't want to share.

Then you may call bulbulator in this way:

    . configs/gpawlik/demo/common.sh && bulbulator.sh -b branch -w eset

or with superblb:

    . configs/tenwamega/demo/common.sh && ./superblb.sh configs/tenwamega/demo/instances*

To set-up/update all demo instances known to bulbulator


# superblb

This is tool to make MANY deploys at once. Check out [the example](/configs/gpawlik/README.md)

# Ideas for the future

## Make it possible to have config both as param and as envs:

`. eset_demo && bulbulator.sh` would just do the job
but it should be still possible to call
`bulbulator.sh -r -b ...`
