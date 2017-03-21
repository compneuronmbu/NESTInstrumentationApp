=============
About the App
=============


Introduction
************
We want an easy way to connect selections of groups of nodes in space. To do this we are creating an App with a simple graphical interface. As a primitive prototype of the App, we are using Python with Matplotlib to plot the layers and select the nodes.


Goals
*****
We want the App to make it easy to select areas in layers to connect, by pointing and clicking in a plot of the nodes. The first thing we need is a graphical representation of the nodes. Selection in the App should be independent of NEST, so the selections can be made on one computer, then uploaded to another which performs the connections and runs the simulation.

When we have the plot of the nodes, we want to be able to choose the shape of the selections: either rectangular, or elliptical. We also want to be able to choose if the selected nodes should be sources or targets in the connection.

Some layers may contain both excitatory and inhibitory neurons in the same positions. Therefore we want to be able to select only excitatory or only inhibitory neurons in our selection. 

The collection of selected areas, each with their selected specifications, can then be exported to some file. The file can then be loaded again by the app, or used to set up the connections in NEST.

When using the selections to create connections in NEST, we should make masks from the selection specifications. Overlapping selections with otherwise same specifications, such as projection and source/target, are merged into a single mask. These masks can then be used to efficiently create the connections.


Implementation
**************

Plotting
--------
The plot of the nodes we want is almost the same as the one given by plotting functions in NEST's Topology module. But as the App should be independent of NEST, we cannot use the visualization functions directly. However, Toplology's plotting function was used as a basis for plotting in the App.

Selecting
---------
Selection of nodes in the plot is made easy by Matplotlib's widgets. The widgets ``RectangleSelector`` and ``EllipseSelector`` will get the lower left and upper right coordinates and the plotted layer in which we made the selection. From this information, the nodes that lay inside the selection can be calculated. The selection along with specifications of its shape and type are stored in a selection collection in form of a Python dictionary.

The selected nodes in the plot should change colour, according to if we have selected source or target nodes. We then have to calculate if the node is inside the selected area. For a rectangular selection this is easy; the coordinates of the node just has to be larger than the coordinates of lower left, but smaller than the coordinates of upper right of the selection. For an elliptical shaped selection, we have to use the ellipse equation and require

.. math::

  \frac{(x-x_0)^2}{a^2} + \frac{(y-y_0)^2}{b^2} \leq 1,

where :math:`x` and :math:`y` are the node's coordinates, :math:`x_0` and :math:`y_0` are the coordinates of the centre of the mask, and :math:`a` and :math:`b` are the semi-major and semi-minor axes of the ellipse.

To have more than one population of source and target pairs, we have the possibility to switch projections. This way, one projection can specify the connections from input nodes, another projection can specify connections between excitatory and inhibitory nodes, and a third can specify connections to output nodes.

Exporting and importing selections
----------------------------------
When the selection is done, the collection of selected areas can be saved to a file, or, if NEST is imported, the connections can be made. The collection of selections is in the format of a Python dictionary with the following structure:

::

  {layer_name_1: {projection_1: list_of_selections,
                  projection_2: list_of_selections,
                  etc},
   layer_name_2: {projection_1: list_of_selections,
                  projection_2: list_of_selections,
                  etc},
   etc}

Each layer has a dictionary of projections, and each projection has a list of selections. A selection is a list containing mask shape, coordinates for lower left and upper right, if it's a source or target selection, and choice of excitatory and/or inhibitory neurons.

Currently the App saves and loads selection collections by using Python's ``pickle`` module.

User interface
--------------
There are two kinds of user interfaces implemented. One uses PyQt5, making it a standalone application, while the other uses Jupyter Notebook, making it publishable in the Human Brain Project Collaboratory. The graphical user interface and the core of the App are glued together with a dedicated class which performs the interactions.

The user interface works by using callback functions. Elements, for example buttons, in the user interface are given a function to be called in response to mouse clicks or key presses. So in the event of a pushed button, or selection of an area in the plot, a corresponding function is called. This function can also get information about the event, like position of the mouse or key pressed.

Testing
-------
It is important to always test the code during development. For this we use Python's unittest suite. By using unittests we can easily run a suite of tests, testing different parts of the App. This way we make sure that no parts are broken during development of the App.


Thoughts on problems
********************

As this is just a first prototype of the App, there are still a few problems and missing features left. The implementation of the visualization of nodes is a simple one as we use Python with Matplotlib. A more advanced implementation that is more tailored to our needs would be desirable. Additionally, by having a more tailored implementation of the visualization, we could expand the plotting and selection of connections to three dimensions.

Currently the App is only tested for two two example systems: A simple Brunel system, and a Hill-Tononi system. However, as we want it not to be limited to a small set of example systems, the App has to work for any system. This will require some additional adaptation.

When using the App to simulate, it is possible to plot the spiketrain of the nodes at the end of the simulation. Instead we want to get the spiketrains as they happen, plotting spiketrains in realtime.

In addition to these planned enhancements to the App, there may be other problems emerging. As the App haven't really been tested by any real users yet, the scope of problems has so far been limited, and we expect to see more problems as the App becomes more widely available.

