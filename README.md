# NEST Instrumentation App

The NESTInstrumentationApp is a graphical user interface to connect recording and stimulation devices to networks in [NEST](http://www.nest-simulator.org).

<p align="center">
  <img src="documentation/figures/3D_example.png" width=60%>
</p>

The app client is implemented in JavaScript, with the libraries [three.js](https://threejs.org/) and [React](https://facebook.github.io/react/). The server uses a [Flask](http://flask.pocoo.org/) microframework with NEST in a separate process. The interaction between the server and NEST is done with [ØMQ](http://zeromq.org/), using a Python module called nett.

## Dependencies

You need NEST built with Python support, and importable from Python. To run simulations directly from the app, you need the NEST developer version with tag [`External/TopologySelectNodes`](https://github.com/nest/nest-simulator/tree/External/TopologySelectNodes) or later.

The communication between the Flask server and NEST is done with the included nett module. However, using the nett module requires some paths to be added to ```PYTHONPATH``` and ```LD_LIBRARY_PATH```. To easily add these, run

```
source ./nett_modules/exports.sh
```

Be aware that this will replace everything in ```PYTHONPATH```, so remember to add your PyNEST path to it afterwards. Additionally, you will need the following non-standard Python modules: [gevent](http://www.gevent.org/), [Flask](http://flask.pocoo.org/), and [Flask-SocketIO](https://flask-socketio.readthedocs.io/en/latest/).

You also need a JavaScript package manager installed, like [Yarn](https://yarnpkg.com) or [npm](https://www.npmjs.com/). For brevity we will use Yarn in the examples, but if you're using npm, simply replace ```yarn``` with ```npm``` below. To run the JavaScript tests, you will also need [Node.js](https://nodejs.org/en/), and for testing the Python backend, you'll need [nose](http://nose.readthedocs.io/en/latest/). For generating documentation on the Python backend, you will need [Sphinx](http://www.sphinx-doc.org/en/stable/index.html).

Inside the folder ```../certs``` you need to generate a self-signed SSL certificate and key called ```fsd-cloud42_zam_kfa-juelich_de.key``` and ```fsd-cloud42_zam_kfa-juelich_de.pem```.

Once you have a package manager for JavaScript, installing the dependencies for running the app is done by simply running

```
$ yarn
```

## Running the App

First start the server with

```
$ yarn start
```

Then open your web browser and go to `http://127.0.0.1:7000/NESTInstrumentationApp`.


## Running the testsuite

To run the full testsuite, run

```
$ yarn test_all
```

You can also run only the JavaScript testsuite with

```
$ yarn test
```

or just the Python testsuite with

```
$ nosetests
```

## Generating the documentation

To generate the documentation, run

```
$ yarn doc
```

Documentation on the JavaScript part can then be found in `documentation/javascript/index.html`, while documentation on the Python backend can be found in `documentation/python/build/html/index.html`.
