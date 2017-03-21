==========================
Documentation for the code
==========================


The App core
************

The PointsSelector Class
------------------------

.. autoclass:: NESTConnectionApp.selector.PointsSelector
   :members:

Interfacing with the PointsSelector Class
-----------------------------------------

.. autoclass:: NESTConnectionApp.selector.SelectorInteraction
   :members:


Graphical User Interface
************************

Qt GUI
------

The Qt GUI consists of two classes. The class ``AppUI`` handles the GUI window itself, and its main task, besides initializing the PyQt5 window, is writing the plot to the window, and handling exit events.

The other class, ``QtGUI``, connects the window to the core of the App. Its job is to create a window with the ``AppUI`` class, and connect buttons to functions in the App's core.

.. automodule:: NESTConnectionApp.GUI.qt_gui
   :members:

Notebook GUI
------------

.. automodule:: NESTConnectionApp.GUI.nb_gui
   :members:


Connection to NEST
******************

.. automodule:: NESTConnectionApp.nest_interface
   :members:
