# MetaThree
Metathree contains both the ThreeML client script, as well as a NodeJS based ThreeML server. The project can be checked at http://www.threeml.org.

The clientscript makes use of ThreeJS, and makes it possible to use metatags to setup a 3D scene. Many frequently used logic can be added just by specifying tags with attributes.
Still the ThreejS objects are accessible for add extra logic by scripting if required.

The server has several API's to support usage statistics, present websites etc. It uses an SQLite database for storage.

Requirements
- A local copy of the code
- A recent version of NodeJS (https://nodejs.org/en/)
Handy
- VSCode (https://code.visualstudio.com/)
- DB Browser for SqLite (https://sqlitebrowser.org/)

Run the project
- Go to the project root folder
- When working with VSCode, type: Code .
- type in command window: Node index.js
- Click the run button in VSCode, or goto a browser and navigate to: http://localhost:8080
