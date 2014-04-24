#!/bin/bash
show_usage() {
echo "

Usage:

1. Get Bulbulator from latest repo.

2. run bulbulator with required ENV variables set up

   2.1 Either from file
   . etc/bulbulator.config.sh && bash bulbulator.sh -r REPOSITORY_URL -b BRANCH -e ENV -w WEBSITE [-s SUBDOMAIN] [--with-db-drop]

   2.2 or via command line
   MYSQL_USER=dev MYSQL_PASSWORD=secret (...and so on ;) ./bulbulator.sh -r Nexway-3.0/ -b bulbulator-split -w eset -e prep -w demo1.gpawlik.nexwai.pl --with-db-drop

It will be installed in $BASE_SETUP_DIR (check etc/bulbulator.config.sh.sample) and be accessible
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

print_msg()
{
    echo -e "\n----------------------------------------------------------------------"
    echo -e $1
    echo -e "----------------------------------------------------------------------\n"
}

illegal_char_replace()
{
	echo $1 | sed 's/[^a-z^0-9^A-Z]/'$2'/g'
}

get_current_timestamp()
{
    echo `date +%s`
}

script_dir=$(cd `dirname $0` && pwd)
#if [ ! -f $script_dir/etc/bulbulator.config.sh ]; then
#	echo 'Missing configuration file (etc/bulbulator.config.sh).'
#	echo 'Please review a etc/bulbulator.config.sh.sample for futher informations.'
#	show_usage
#	exit 1
#fi

# . $script_dir/etc/bulbulator.config.sh

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
        --with-db-drop)
            shift
            export DROP_DB=true
            ;;
        *)
            break
            ;;
    esac
done

#echo
#echo "--- VARS ---"
#echo $REPOSITORY_URL
#echo $BRANCH
#echo $COMMIT_HASH
#echo $ENV_NAME
#echo $WEBSITE
#echo $SUB_DOMAIN
#echo $DROP_DB
#exit

if [ -z "$REPOSITORY_URL" ]; then
    echo "(-r) Repository url param is missing"
    show_usage
    exit 1
fi
if [ -z "$BRANCH" ]; then
    echo "(-b) Branch param is missing"
    show_usage
    exit 1
fi
if [ -z "$ENV_NAME" ]; then
    echo "(-e [prep|prod]) Env name param is missing"
    show_usage
    exit 1
fi
if [ -z "$WEBSITE" ]; then
    echo "(-w) Website param is missing"
    show_usage
    exit 1
fi
if [ -z "$SUB_DOMAIN" ]; then
    export SUB_DOMAIN="testing.nexwai.pl"
fi

export SETUP_DIR_LINK=$BASE_SETUP_DIR`illegal_char_replace $BRANCH '-'`
export SETUP_DIR=$SETUP_DIR_LINK-`get_current_timestamp`

# e.g http://eset.eset_testing.testing.nexwai.pl/
export DOMAIN=`illegal_char_replace $BRANCH '-'`
export STORE_URL="http://"${WEBSITE}.${DOMAIN}.${SUB_DOMAIN}"/"

export MYSQL_DB_NAME=$MYSQL_DB_PREFIX`illegal_char_replace $BRANCH '_'`

# exit if environment exist
#if [ -d "$SETUP_DIR" ]; then
#    echo "ERROR! This environment already exists, remove it before ($SETUP_DIR)"
#    echo -e "try \n\t\trm -rf $SETUP_DIR"
#    exit 1
#fi

# create base setup dir if not exist e.g /var/www/testing/
if [ ! -d "$BASE_SETUP_DIR" ]; then
    # check if we have permission to create "testing" directory
    if [ -w "$BASE_SETUP_DIR_TO_CHECK" ]; then
        print_msg "Step: Create directory" $BASE_SETUP_DIR
        mkdir -p $BASE_SETUP_DIR || { echo "ERROR! Directory not created" ; exit 1; }
        echo Directory created
    # print error if we do not have permissions
    else
        echo "ERROR!  Permission denied for BASE_SETUP_DIR_TO_CHECK=$BASE_SETUP_DIR_TO_CHECK"
        exit 1
    fi
fi

if [ -a "$SETUP_DIR" ] && [ ! -w "$SETUP_DIR" ]; then
    echo "ERROR!  Permission denied for destination dir: $SETUP_DIR"
    exit 1
fi

print_msg "Step: Download repository $REPOSITORY_URL to $SETUP_DIR"

## Cache repo!!
TMP_REPO=/tmp/.`illegal_char_replace $REPOSITORY_URL '_'`
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

if [ -L "$SETUP_DIR_LINK" ]; then
    print_msg "Step: Coping old instance from sybolic link"
    # we are not able to use "cp -RL" (nested media symlink)
    dir_to_copy=`readlink -f "$SETUP_DIR_LINK"`
    if [ -d $dir_to_copy ]; then
        cp -R "$dir_to_copy" "$SETUP_DIR" 2>/dev/null
    else
        print_msg "Error! Cannot copy old instance of Magento from sumbolic link which points to $dir_to_copy"
        exit 1;
    fi

    print_msg "Step: update git"
    cd $SETUP_DIR
    git fetch origin
    git checkout origin/$BRANCH
    git branch -D $BRANCH
    git checkout -b $BRANCH
    cd -
elif [ -d "$SETUP_DIR_LINK" ]; then
    print_msg "Step: Coping old instance"
    cp -R "$SETUP_DIR_LINK" "$SETUP_DIR"
    
    print_msg "Step: update git"
    cd $SETUP_DIR
    git fetch origin
    git checkout origin/$BRANCH 
    git branch -D $BRANCH
    git checkout -b $BRANCH
    cd -
else
    print_msg "Step: Cloning repo"
    git clone $TMP_REPO $SETUP_DIR || { print_msg "Error! Cannot clone repo"; exit 1; }
fi

cd $SETUP_DIR

for branch in `git branch -a | grep remotes | grep -v HEAD | grep -v develop`; do
    git branch --track ${branch##*/} $branch 2> /dev/null # when branches are already there - we don't want him complain
done

print_msg "Step: checkout to branch - $BRANCH"
git checkout $BRANCH || { print_msg "Error! Git checkout failed!" ; exit 1; }
if [ ! -f ./shell/bulbulator/bulbulate.sh ]; then
	echo "";
	echo "ERROR! Branch you're trying to get is not compatibile with new version of bulbulator
please merge with latest main branch."	
	exit 1;    
fi

./shell/bulbulator/bulbulate.sh 
