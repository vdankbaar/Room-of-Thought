# Room-of-Thought (RoT)
 A simple selfhostable virtual tabletop simulator.

# Important directories
* /client/public/maps: Add images of your maps here
* /client/public/tokens: Add tokens that the players may create here
* /client/public/dmTokens: Add tokens that only the DM may create here (Keep monster tokens here to prevent spoilers)
* /data: You can find the json files containing the map states here. Be sure to make occasional copies of these to backup your progress.

# Starting the server
 To start the server simply run:
 ```
 npm start
 ```
 This will start an http server on port 80 by default. On windows you may need to run the unblock batch script to kill some other processes using the port. You can also change the default port in the main.ts file.

# Modifying the client
 To build the typescript files from the src folder so changes are reflected in the client, run the following command:
 ```
 npm run build
 ```
 This script will also watch for file changes in the background, automatically rebuilding whenever you save. It will still require you to refresh the webpage.

# Modifying the server
 You can make changes to the server simply by editing main.ts. Do not forget to restart the server after making changes.

# Missing parts
 To be able to run the code directly from this repo you will need to make sure there exists:
 * A 'currentSettings.json' json file in /data for the server to initialize with
 * A 'White.png' map in /client/public/maps for use in the json file above

 Alternatively just download one of the releases and use that if you do not plan on modifying anything