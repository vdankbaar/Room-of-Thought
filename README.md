# Room-of-Thought
 A simple selfhostable virtual tabletop simulator.

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
 This script will also watch for file changes in the background, automatically rebuilding whenever you save.

# Missing parts
 To make the code work you will need to make sure there is:
 * A 'currentSettings.json' json file in /data for the server to initialize with
 * A 'White.png' map in /client/public/maps for use in the json file above
 Alternatively just download one of the releases