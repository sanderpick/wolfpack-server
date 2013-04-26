*API, scheduled mail tasks, and mail-bot for Wolfpack*

<img src="https://github.com/sanderpick/wolfpack-server/raw/develop/public/img/server.png"/>

## Development

    git clone git@github.com:sanderpick/wolfpack-server.git
    cd wolfpack-server
    npm install
    node main.js

## MongoDB Server

You need to have MongoDB running on your local machine. 

#### Installation 

    brew update
    brew install mongodb

##### Prepare for db

    sudo touch /var/log/mongod.log
	sudo mkdir -p /data/db
	
#### Starting MongoDB 

	sudo mongod --fork --logpath /var/log/mongod.log