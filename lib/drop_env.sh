confirm()
{
    # call with a prompt string or use a default
    read -r -p "${1:-Are you sure? [y/N]} " response
    case $response in
        [yY][eE][sS]|[yY])
            true
            ;;
        *)
            false
            ;;
    esac
}

drop_db()
{
    mysql -h $MYSQL_DB_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e "drop database IF EXISTS $MYSQL_DB_NAME" || { print_msg "Error! Drop database $MYSQL_DB_NAME command failed!" ; }
}

drop_database_and_remove_files()
{

    if [ -h "$SETUP_DIR_LINK" ]; then
    	print_msg "Step: Dropping database and removing directories"
        # drop database remove symbolic link  remove all directories
        drop_db & rm $SETUP_DIR_LINK & rm -rf $SETUP_DIR_LINK*

        # remove branch dir if empty
        if [ ! "$(ls -A $SETUP_BRANCH_BASE_DIR)" ]; then
            print_msg "Removing empty branch dir: $SETUP_BRANCH_BASE_DIR"
            rmdir $SETUP_BRANCH_BASE_DIR
        fi
	else
    	print_msg "Step: Dropping database" 
		drop_db
    fi

    print_msg "-->> Bulbulator: I've done all the work for you!"
}

print_files_to_remove()
{
    if [ -h "$SETUP_DIR_LINK" ]; then
        for i in `ls -d $SETUP_DIR_LINK*`; do echo "  -- "$i; done;
    else
        print_msg "No files to remove"
    fi
}

notify_deletion()
{
    if [ -n "$SEND_NOTIFICATION" ]; then
        print_msg "Step: Notify the centrale."

        ENV_HASH=`cat $SETUP_DIR_LINK/.bulbulator.json | php -r 'echo json_decode(file_get_contents("php://stdin"))->env_hash;'`

        curl -X POST --insecure \
            --connect-timeout 2 \
            --data-urlencode "env_hash=$ENV_HASH" \
            $HOOK_DELETION_URL
    fi
}

drop_environment()
{
    if [ ! -d "$SETUP_BRANCH_BASE_DIR" ]; then
        print_error "Directory for given branch does not exist!"
        exit 1;
    fi

    print_msg "WARNING! This command will drop the following instance:"

    echo "Instance info:"
    echo "  Website: $WEBSITE"
    echo -e "  DB host: $MYSQL_DB_HOST\n"

    echo "Database to drop:"

    echo "  -- $MYSQL_DB_NAME"
    echo -e "\nDirectories to remove:"

    print_files_to_remove

    echo ""
    
    if [ -n "$IS_JENKINS" ]; then
        print_msg "Dropping the instance..."
        notify_deletion
        drop_database_and_remove_files
    else
	    confirm "Would you really like to drop this instance? [y/N]"
	
	    if [ $? -eq 0 ]; then
	        notify_deletion
	        drop_database_and_remove_files
	    else
	        print_msg "Command aborted by user."
	    fi
    fi
}
