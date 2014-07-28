Bulbulator UI
=============

## Install

`npm install`
`bower install`

## Start

`npm start`

### Production
For production use, use [forever][0].

```bash
npm install -g forever
forever start bin/www
```

## How to create a BBL-UI compatible instance

```bash
useradd -s /bin/bash -g www-data -r /var/www -p `openssl passwd wXmMVGCFxaZudT5B` bulbulator
git clone https://github.com/NexwayGroup/bulbulator.git
chmod 770 /var/www/environments
```

### Create the SQL user
```sql
CREATE USER 'bulbulator'@'localhost' IDENTIFIED BY 'wdZcyreHxDmyQWf8';GRANT USAGE ON *.* TO 'bulbulator'@'localhost' IDENTIFIED BY 'wdZcyreHxDmyQWf8' WITH MAX_QUERIES_PER_HOUR 0 MAX_CONNECTIONS_PER_HOUR 0 MAX_UPDATES_PER_HOUR 0 MAX_USER_CONNECTIONS 0;GRANT ALL PRIVILEGES ON `bulbulator\_%`.* TO 'bulbulator'@'localhost';
```

### User Configuration
Issue as user "bulbulator", the following commands:
```bash
echo -e "TCPKeepAlive yes\nControlMaster auto\nControlPath /tmp/%r@%h:%p\nControlPersist yes" >> ~/.ssh/config
git config --global core.filemode false
git config --global color.ui auto
git config --global advice.pushNonFastForward false
git config --global advice.statusHints false
git config --global core.whitespace trailing-space,space-before-tab
```

[0]: http://github.com/nodejitsu/forever