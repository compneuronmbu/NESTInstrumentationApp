from __future__ import print_function
import pkg_resources
from PyQt5.uic import loadUiType
from PyQt5.QtWidgets import QApplication, QMessageBox
from matplotlib.backends.backend_qt5agg import (
    FigureCanvasQTAgg as FigureCanvas,
    NavigationToolbar2QT as NavigationToolbar)

ui_path = pkg_resources.resource_filename('NESTConnectionApp',
                                          'GUI/Qt_App_GUI.ui')

Ui_AppUI, QMainWindow, = loadUiType(ui_path)


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
        if self.guiclass.selector_interaction.get_if_changes_made():
            self.event = event
            msg = QMessageBox()
            msg.setWindowTitle("Save selections")
            msg.setText("You have unsaved selections. Save selections?")
            msg.setIcon(QMessageBox.Question)
            msg.setStandardButtons(QMessageBox.Yes |
                                   QMessageBox.No |
                                   QMessageBox.Cancel)
            msg.buttonClicked.connect(self._message_button_clicked)

            msg.exec_()

            # Todo:
            # A different solution would be to use the retval
            # Then we don't have to save the event to self.event,
            # or use a callback function.
            #
            # retval = msg.exec_()
            # print("retval=", retval)

    def _message_button_clicked(self, button):
        if button.text() == u'&Yes':
            self.guiclass.selector_interaction.save()
            self.event.accept()
        elif button.text() == u'&No':
            self.event.accept()
        else:
            self.event.ignore()


class QtGUI(object):
    """
    PyQt5 user interface.

    :param Selector: The PointsSelector class to connect to.
    """

    def __init__(self, selector_interaction):
        # from PyQt5.QtWidgets import QApplication
        # from .app_ui import AppUI
        try:
            from ..nest_interface import NESTInterface
            self.have_nest = True
            print("Found NEST")
        except ImportError:
            self.have_nest = False
            print("NEST not found")

        self.selector_interaction = selector_interaction
        self.ui_app = QApplication([])
        self.ui_window = AppUI(self)

        self.syn_models = (
            self.selector_interaction.selector.get_synapse_models())

        if self.have_nest:
            self.nest_interface = NESTInterface(
                self.selector_interaction.selector.layer_spec,
                models=self.selector_interaction.selector.models)
        else:
            self.nest_interface = None

        self.neuron_type_list = ['all']
        self.neuron_type_list += self.selector_interaction.get_net_elements()

        self.make_GUI()

    def show(self):
        """
        Shows the GUI.
        """
        self.ui_window.show()
        self.ui_app.exec_()

    def make_GUI(self):
        """
        Sets up the GUI by initializing the plot, selectors, and connecting
        callbacks for the buttons.
        """
        self.ui_window.add_plot(self.selector_interaction.selector.fig)
        self.selector_interaction.selector.set_mask_shape()

        self.ui_window.combo_proj.activated.connect(
            self._proj_combo_on_activation)

        # TODO: Make function in selector_interaction
        self.ui_window.synapse_models.addItems(self.syn_models)

        self.ui_window.synapse_models.activated.connect(
            self._synapse_models_on_activation)

        self.ui_window.combo_neuron.activated.connect(
            self._combo_neuron_on_activation)

        self.ui_window.radio_shape_rect.clicked.connect(
            self._mask_selector_rect_clicked)
        self.ui_window.radio_shape_ell.clicked.connect(
            self._mask_selector_ellipse_clicked)

        self.ui_window.radio_type_source.clicked.connect(
            self._source_button_clicked)
        self.ui_window.radio_type_target.clicked.connect(
            self._target_button_clicked)

        self.ui_window.undo_button.clicked.connect(
            self._undo_button_on_clicked)
        self.ui_window.redo_button.clicked.connect(
            self._redo_button_on_clicked)

        self.ui_window.save_button.clicked.connect(
            self._save_selection_on_clicked)
        self.ui_window.load_button.clicked.connect(
            self._load_selection_on_clicked)

        self.ui_window.reset_button.clicked.connect(
            self._reset_button_on_clicked)
        self.ui_window.quit_button.clicked.connect(
            self._close_fig_button_on_clicked)

        # self.ui_window.connect_to_nest_button.clicked.connect(
        #    self._connect_to_nest_button_on_clicked)

        self.ui_window.connect_button.clicked.connect(
            self._connect_button_on_clicked)
        self.ui_window.simulate_button.clicked.connect(
            self._sim_button_on_clicked)

        self.ui_window.combo_neuron.addItems(self.neuron_type_list)

        nest_status_text = "Found" if self.have_nest else "Not found"
        self.ui_window.nest_connected_label.setText(nest_status_text)

        self.ui_window.undo_button.setEnabled(False)  # Nothing to undo or
        self.ui_window.redo_button.setEnabled(False)  # redo at initialization

        self.ui_window.connect_button.setEnabled(self.have_nest)
        self.ui_window.simulate_button.setEnabled(self.have_nest)

    def activate_undo(self):
        self.ui_window.undo_button.setEnabled(True)

    def warning_message(self, message):
        self._show_status_message(message, 5000, "red")

    def _show_status_message(self, message, timeout=0, colour="black"):
        self.ui_window.statusbar.clearMessage()
        self.ui_window.statusbar.setStyleSheet("color: %s" % colour)
        self.ui_window.statusbar.showMessage(message, timeout)

    def _mask_selector_rect_clicked(self):
        self._mask_selector_button_on_clicked("rectangle")

    def _mask_selector_ellipse_clicked(self):
        self._mask_selector_button_on_clicked("ellipse")

    def _mask_selector_button_on_clicked(self, label):
        """
        Creates the correct shape of the mask when the respective shape on mask
        selector button is pressed.
        """
        self.selector_interaction.change_mask_shape(label)

    def _source_button_clicked(self):
        self._source_target_button_on_clicked("source")

    def _target_button_clicked(self):
        self._source_target_button_on_clicked("target")

    def _source_target_button_on_clicked(self, label):
        """
        Choose whether areas created after Source/Target button is clicked are
        source or target.
        """
        self.selector_interaction.change_mask_type(label)

    def _proj_combo_on_activation(self, proj_index):
        selector = self.selector_interaction.selector
        projection = selector.cprojection_list[proj_index]
        print("\nSelected projection %s \n" % projection)
        self.selector_interaction.change_projection(projection)

    def _combo_neuron_on_activation(self, neuron_index):
        neuron_type = self.neuron_type_list[neuron_index]
        print("Neuron type '%s' selected" % neuron_type)
        self.selector_interaction.change_neuron_selection(neuron_type)

    def _synapse_models_on_activation(self, syn_mod_index):
        syn_model = self.syn_models[syn_mod_index]
        print("\nSelected synapse model %s \n" % syn_model)
        self.selector_interaction.change_syn_model(syn_model)

    def _undo_button_on_clicked(self, event):
        print("Undo button clicked")
        self.selector_interaction.undo()
        self.ui_window.redo_button.setEnabled(True)
        if len(self.selector_interaction.get_selection_history()) == 0:
            self.ui_window.undo_button.setEnabled(False)

    def _redo_button_on_clicked(self, event):
        print("Redo button clicked")
        self.selector_interaction.redo()
        self.ui_window.undo_button.setEnabled(True)
        if len(self.selector_interaction.get_undo_history()) == 0:
            self.ui_window.redo_button.setEnabled(False)

    # def _connect_to_nest_button_on_clicked(self, event):
    #     print("Connect to NEST button")
    #     self.selector_interaction.connect_to_nest()
    #     self.ui_window.nest_connected_label.setText("Connected")
    #     self.ui_window.connect_to_nest_button.setEnabled(False)
    #     self.ui_window.find_gids_button.setEnabled(True)
    #     self.ui_window.connect_button.setEnabled(True)
    #     self.ui_window.simulate_button.setEnabled(True)

    def _connect_button_on_clicked(self, event):
        print("\nConnect button\n")

        self._show_status_message("Connecting ...")
        self.nest_interface.connect(
            self.selector_interaction.selector.get_selections(),
            self.selector_interaction.selector.connections)
        self._show_status_message("Connection finished!", 2000)

    def _sim_button_on_clicked(self, event):
        print("\nSimulate button\n")

        if self.nest_interface.get_num_connections() == 0:
            self._show_status_message("Cannot simulate;" +
                                      " No connections!", 5000, "red")
        else:
            self._show_status_message("Simulating ...")
            self.nest_interface.simulate(simtime=100, make_plot=True,
                                         print_time=True)
            self._show_status_message("Simulation finished!", 2000)

    def _save_selection_on_clicked(self, event):
        """Saves current selected area to file"""
        print("")
        print("Save button clicked!")
        print("")

        self.selector_interaction.save()
        self._show_status_message("Saved connections", 2000)

    def _load_selection_on_clicked(self, event):
        """Saves current selected area to file"""
        print("")
        print("Load button clicked!")
        print("")

        self.selector_interaction.load()
        self._show_status_message("Loaded connections", 2000)

    def _reset_button_on_clicked(self, event):
        """"Removes selected areas when Reset button is pressed"""

        print("")
        print("pressed reset button")
        print("")

        nest_reset = " "
        self.selector_interaction.reset()
        if self.nest_interface is not None:
            self.nest_interface.reset()
            self.nest_interface.reset_nest()
            self.nest_interface.make_layers_and_models()
            nest_reset = " and NEST "
        if self.selector_interaction.selector.connection_type != 'source':
            # self._source_button_clicked()
            self.ui_window.radio_type_source.click()

        self.ui_window.undo_button.setEnabled(False)
        self.ui_window.redo_button.setEnabled(False)
        self._show_status_message("App" + nest_reset + "is reset!", 2000)

    def _close_fig_button_on_clicked(self, event):
        """Closes figure when button is clicked"""

        print("")
        print("pressed close figure button")
        self.ui_window.close()
