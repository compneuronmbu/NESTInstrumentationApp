# NESTConnectionApp

The NESTConnectionApp is a graphical user interface to create connections in [NEST](https://github.com/nest/nest-simulator).

## Installing the App

The NESTConnectionApp requires the following packages to run:

- numpy
- matplotlib
- PyQt5
- IPython and ipywidgets

Note that NEST is not required to run the App (it can however be interfaced with the NESTConnectionApp).

To build the NESTConnectionApp you can simply run
```
$ python setup.py install
```
This will build and install it to Python's site-packages folder.  

## Running the App

There are two ways to run the NESTConnectionApp. 

The first is to use `ConnectionApp.py`. For the Brunel example it can be run with
```
$ ./ConnectionApp define_brunel.py
```
And for the Hill-Tononi example it can be run with
```
$ ./ConnectionApp define_hill_tononi.py
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
