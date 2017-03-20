import sys
import pkg_resources
from PyQt5.uic import loadUiType
from matplotlib.backends.backend_qt5agg import (
    FigureCanvasQTAgg as FigureCanvas,
    NavigationToolbar2QT as NavigationToolbar)

app_path = sys.path[0]
ui_path = pkg_resources.resource_filename('NESTConnectionApp',
                                          'GUI/Qt_App_GUI.ui')

Ui_AppUI, QMainWindow, = loadUiType(ui_path)

# todo: flytt til QT fil

class AppUI(QMainWindow, Ui_AppUI):
    """
    Class handling the PyQt5 graphical user interface. Uses specifications from
    a ui-file to create a graphical user interface with PyQt5.
    """

    def __init__(self):
        super(AppUI, self).__init__()

        # Set up user interface
        self.setupUi(self)

        # Local modifications
        # (none so far..)

    def add_plot(self, fig):
        """
        Adds a plot to the GUI window.

        :param fig: Figure to add.
        """
        self.canvas = FigureCanvas(fig)
        self.plotGrid.addWidget(self.canvas, 0, 0, 1, 1)
        self.canvas.draw()
        self.toolbar = NavigationToolbar(self.canvas, self.mplwindow,
                                         coordinates=True)
        self.plotGrid.addWidget(self.toolbar)
