# NEST Connection App

The NESTConnectionApp is a graphical user interface to create connections in [NEST](http://www.nest-simulator.org).

## Dependencies

You need NEST built with Python support, and importable from Python.
You also need a JavaScript package manager installed, like [Yarn](https://yarnpkg.com) or [npm](https://www.npmjs.com/). To run the JavaScript tests, you will also need [Node.js](https://nodejs.org/en/).

Once you have a package manager for JavaScript, installing the dependencies is done by simply running either

```
$ yarn
```

or 

```
$ npm
```

depending on your package manager of choice.

For testing the Python backend, you'll need [nose](http://nose.readthedocs.io/en/latest/).

## Running the App

First start the server with

```
$ yarn start
```

or

```
$ npm start
```

Then open your web browser and go to `http://127.0.0.1:5000/NESTConnectionApp`.


## Running the testsuite

To run the JavaScript testsuite with Yarn, run

```
$ yarn test
```

To run them with npm, run

```
$ npm test
```

Testing the Python backend can be done with

```
$ nosetests
```
