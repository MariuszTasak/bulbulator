export MYSQL_USER="dev"
export MYSQL_PASSWORD="dev"
export MYSQL_DB_PREFIX="blb_"
export MYSQL_DB_HOST=`echo $SSH_CLIENT | awk '{print $1}'`

export BASE_SETUP_DIR_TO_CHECK="/home/gpawlik/vhosts/"
export BASE_SETUP_DIR=$BASE_SETUP_DIR_TO_CHECK"blb/"

export MEDIA_DIR="/home/root/mediasync_v2/"
export REPOSITORY_URL=git@github.com:pawlik/Nexway-3.0

export SUB_DOMAIN=blb.gpawlik.nexwai.pl


