# NEST Connection App

The NESTConnectionApp is a graphical user interface to create connections in [NEST](http://www.nest-simulator.org).

## Installing the App

The NESTConnectionApp requires the following packages to run:

- numpy
- matplotlib
- PyQt5
- IPython and ipywidgets

Note that NEST is not required to run the App. If NEST is available,
you can run simulations directly from the App. You will need the NEST
developer version with tag
[`External/TopologySelectNodes`](https://github.com/nest/nest-simulator/tree/External/TopologySelectNodes)
or later.

To build the NESTConnectionApp you can simply run
```
$ python setup.py install
```
This will build and install it to Python's site-packages folder.

### Running the testsuite

After installing the app, run the following in Python to execute the
testsuite (requires NEST in `PYTHONPATH`):
```
import NESTConnectionApp.tests.test_all as nca_tests
nca_tests.run()
```

## Running the App

There are two ways to run the NESTConnectionApp. 

The first is to use `nest_connection_app`. For the Brunel example it can be run with
```
$ ./nest_connection_app.py examples/define_brunel.py
```
And for the Hill-Tononi example it can be run with
```
$ ./nest_connection_app.py examples/define_hill_tononi.py
```

Another way to run the App is in an interactive Jupyter Notebook, 
for which there is an example in `examples/ConnectionAppDemo.ipynb`.

## Building the documentation

The documentation is created using [Sphinx](http://www.sphinx-doc.org/en/stable/), 
and can be built using `make`. To output the documentation to HTML, you can from 
the `/docs` directory run
```
$ make html
```
The documentation will then be the output in `docs/_build/html`.

Note that Sphinx uses *autodoc*, which imports the modules to be documented. 
NEST must therefore be in the `PYTHONPATH` if documentation for the class 
`NESTInterface` is to be generated.
