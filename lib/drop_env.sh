confirm() {
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

drop_database_and_remove_files()
{
    print_msg "Step: Dropping database"
    mysql -h $MYSQL_DB_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e "drop database IF EXISTS $MYSQL_DB_NAME" || { print_msg "Error! Drop database $MYSQL_DB_NAME command failed!" ; }

    print_msg "Step: Removing directories"

    if [ -h "$SETUP_DIR_LINK" ]; then
        # remove symbolic link
        rm $SETUP_DIR_LINK

        #remove all directories
        rm -rf $SETUP_DIR_LINK*

        # remove branch dir if empty
        if [ ! "$(ls -A $SETUP_BRANCH_BASE_DIR)" ]; then
            print_msg "Removing empty branch dir: $SETUP_BRANCH_BASE_DIR"
            rmdir $SETUP_BRANCH_BASE_DIR
        fi
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

drop_environment()
{
    if [ ! -d "$SETUP_BRANCH_BASE_DIR" ]; then
        print_error "Directory for given branch does not exist!"
        exit 1;
    fi

    print_msg "WARNING! This command will drop following instance!"

    echo "Instance info:"
    echo "  Website: $WEBSITE"
    echo -e "  DB host: $MYSQL_DB_HOST\n"

    echo "Database to drop:"

    echo "  -- $MYSQL_DB_NAME"
    echo -e "\nDirectories to remove:"

    print_files_to_remove

    echo ""

    confirm "Would you really like to drop this instance? [y/N]"
    
    if [ $? -eq 0 ]; then
        drop_database_and_remove_files
    else
        print_msg "Command aborted by user."
    fi
}