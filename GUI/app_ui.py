import sys
import pkg_resources
from PyQt5.uic import loadUiType
from PyQt5.QtWidgets import QMessageBox
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

    def __init__(self, guiclass):
        super(AppUI, self).__init__()

        # Set up user interface
        self.setupUi(self)
        self.guiclass = guiclass

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

    def closeEvent(self, event):
        print("Close event")
        print self.guiclass.selector_interaction.get_if_changes_made()
        if self.guiclass.selector_interaction.get_if_changes_made():
            self.event = event
            msg = QMessageBox()
            msg.setWindowTitle("Save selections")
            msg.setText("You have unsaved selections. Save selections?")
            msg.setIcon(QMessageBox.Question)
            msg.setStandardButtons(QMessageBox.Yes
                                   | QMessageBox.No
                                   | QMessageBox.Cancel)
            msg.buttonClicked.connect(self._message_button_clicked)

            msg.exec_()

            # Todo:
            # A different solution would be to use the retval
            # Then we don't have to save the event to self.event,
            # or use a callback function.
            #retval = msg.exec_()
            #print("retval=", retval)

    def _message_button_clicked(self, button):
        print(button.text())
        print(type(button.text()))
        print(button.text() == u'&Yes')

        if button.text() == u'&Yes':
            self.guiclass.selector_interaction.save()
            self.event.accept()
        elif button.text() == u'&No':
            self.event.accept()
        else:
            self.event.ignore()
