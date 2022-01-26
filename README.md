# MetaThree
MetaThree is project that aims to investigate the techniques that allows a distributed none propriety set of 3D websites to function as a connected metaverse, based on ThreeJS.  
The project is in an early stage and now contains the ThreeML client script, as well as a NodeJS based ThreeML server. It can be checked at http://www.threeml.org.

The clientscript references ThreeJS, and makes it possible to use meta tags to setup a 3D scene. Much frequently used logic can be added just by specifying tags with attributes.
Still the ThreeJS objects are accessible for adding extra logic by script if required.

The server has several API's to support usage statistics, present websites etc. It uses an SQLite database for storage.

Requirements
- A local copy of the code
- A recent version of NodeJS (https://nodejs.org/en/).
- Instead of using NodeJS, you can also just run [the client code of ThreeML](./data/readme.md). This works on any server that allows you to place the JavaScript-, HTML-, image- and other asset files.

Handy
- VSCode (https://code.visualstudio.com/)
- DB Browser for SqLite (https://sqlitebrowser.org/)

Run the project
- Go to the project root folder
- One time install the dependencies (specified in package.json): npm i
- When working with VSCode, type: Code . (include the dot)
- type in command window: Node index.js
- Click the run button in VSCode, or goto a browser and navigate to: http://localhost:8080
