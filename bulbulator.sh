#!/bin/bash
show_usage() {
echo "

Usage:

Get Bulbulator from latest repo.
bash bulbulator.sh -r REPOSITORY_URL -b BRANCH -e ENV -w WEBSITE [-s SUBDOMAIN]

It will be installed in $BASE_SETUP_DIR (check bulbulator.config.sh.sample) and be accessible
via http://WEBSITE.BRANCH.SUBDOMAIN (ie eset.s30.testing.nexwai.pl)

where
    REPOSITORY_URL  get if from github (git@github.com:NexwayGroup/Nexway-3.0.git)
    BRANCH          branch :)
    ENV             'prod' or 'prep'
    WEBSITE         i.e. eset
    SUBDOMAIN       default testing.nexwai.pl
                    when using on prep.nexwai.pl available are:
                    testing.nexwai.pl and demo.nexwai.pl (define vhosts to have more)
"
}


illegal_char_replace()
{
	echo $1 | sed 's/[^a-z^0-9^A-Z]/'$2'/g'
}

script_dir=$(cd `dirname $0` && pwd)
#if [ ! -f $script_dir/bulbulator.config.sh ]; then
#	echo 'Missing configuration file (bulbulator.config.sh).'
#	echo 'Please review a bulbulator.config.sh.sample for futher informations.'
#	show_usage
#	exit 1
#fi


# . $script_dir/bulbulator.config.sh

while test $# -gt 0; do
    case "$1" in
        -r|--repository)
            shift
            export REPOSITORY_URL=$1
            shift
            ;;
        -b|--branch)
            shift
            export BRANCH=$1
			shift
            ;;
        -c|--commit)
            shift
            export COMMIT_HASH=$1
            shift
            ;;
        -e|--envname)
            shift
            export ENV_NAME=$1
            shift
            ;;
        -w|--website)
            shift
            export WEBSITE=$1
            shift
            ;;
        -s|--sub-domain)
            shift
            export SUB_DOMAIN=$1
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [ -z "$REPOSITORY_URL" ]; then
    echo "Repository url param is missing"
    show_usage
    exit 1
fi
if [ -z "$BRANCH" ]; then
    echo "Branch param is missing"
    show_usage
    exit 1
fi
if [ -z "$ENV_NAME" ]; then
    echo "Env name param is missing"
    show_usage
    exit 1
fi
if [ -z "$WEBSITE" ]; then
    echo "Website param is missing"
    show_usage
    exit 1
fi
if [ -z "$SUB_DOMAIN" ]; then
    export SUB_DOMAIN="testing.nexwai.pl"
fi

export SETUP_DIR=$BASE_SETUP_DIR`illegal_char_replace $BRANCH '-'`

# e.g http://eset.eset_testing.testing.nexwai.pl/
export DOMAIN=`illegal_char_replace $BRANCH '-'`
export STORE_URL="http://"${WEBSITE}.${DOMAIN}.${SUB_DOMAIN}"/"

export MYSQL_DB_NAME=$MYSQL_DB_PREFIX`illegal_char_replace $BRANCH '_'`



# exit if environment exist
if [ -d "$SETUP_DIR" ]; then
    echo "ERROR! This environment already exists, remove it before ($SETUP_DIR)"
    echo -e "try \n\t\trm -rf $SETUP_DIR"
    exit 1
fi

# create base setup dir if not exist e.g /var/www/testing/
if [ ! -d "$BASE_SETUP_DIR" ]; then
    # check if we have permission to create "testing" directory
    if [ -w "$BASE_SETUP_DIR_TO_CHECK" ]; then
        echo "Step: Create directory" $BASE_SETUP_DIR
        mkdir -p $BASE_SETUP_DIR || { echo "ERROR! Directory not created" ; exit 1; }
        echo Directory created
    # print error if we do not have permissions
    else
        echo "ERROR!  Permission denied: $BASE_SETUP_DIR_TO_CHECK"
        exit 1
    fi
fi

echo "Step 0: Download repository $REPOSITORY_URL to $SETUP_DIR"

## Cache repo!!
TMP_REPO=/tmp/.$REPOSITORY_URL
if [ ! -d "$TMP_REPO" ]; then
    git clone $REPOSITORY_URL $TMP_REPO
fi

cd $TMP_REPO
# http://stackoverflow.com/questions/67699/how-do-i-clone-all-remote-branches-with-git
for branch in `git branch -a | grep remotes | grep -v HEAD | grep -v develop`; do
    git branch --track ${branch##*/} $branch 2> /dev/null # when branches are already there - we don't want him complain
done
git checkout $BRANCH
git pull ## update only THE branch in cached repo
## END cache repo

git clone $TMP_REPO $SETUP_DIR || exit 1;

cd $SETUP_DIR
for branch in `git branch -a | grep remotes | grep -v HEAD | grep -v develop`; do
    git branch --track ${branch##*/} $branch
done

echo "Step: checkout to branch - $BRANCH"
git checkout $BRANCH || { print_msg "Error! Git checkout failed!" ; exit 1; }
./shell/bulbulator/bulbulate.sh
