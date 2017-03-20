from __future__ import print_function
import matplotlib.pyplot as plt
import ipywidgets as widgets
import IPython.display as dp


class QtGUI(object):
    """
    PyQt5 user interface.

    :param Selector: The PointsSelector class to connect to.
    """

    def __init__(self, selector_interaction):
        from PyQt5.QtWidgets import QApplication
        from .app_ui import AppUI
        try:
            from ..nest_interface import NESTInterface
            self.have_nest = True
            print("Found NEST")
        except ImportError:
            self.have_nest = False
            print("NEST not found")

        self.selector_interaction = selector_interaction
        # self.selector_interaction = SelectorInteraction(self.Selector)  #
        self.ui_app = QApplication([])
        self.ui_window = AppUI()

        self.syn_models = self.selector_interaction.selector.get_synapse_models()

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
        self.selector_interaction.selector._choose_mask_shape()  # TODO: fix private method

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
        self.selector_interaction.close()


class NotebookGUI(object):
    """
    iPython graphical user interface.

    :param Selector: The PointsSelector class to connect to.
    """

    def __init__(self, selector_interaction):
        try:
            from ..nest_interface import NESTInterface
            self.have_nest = True
        except ImportError:
            self.have_nest = False
            print("NEST not found")

        self.selector_interaction = selector_interaction

        if self.have_nest:
            self.nest_interface = NESTInterface(
                self.selector_interaction.selector.layer_spec,
                self.selector_interaction.selector.models)
        else:
            self.nest_interface = None

        self.syn_models = self.selector_interaction.selector.get_synapse_models()

        self.make_GUI()

    def show(self):
        """
        Shows the GUI.
        """
        plt.show()

    def make_GUI(self):
        """
        Sets up the GUI by initializing the selectors and connecting callbacks
        for the buttons.
        """
        self.selector_interaction.selector._choose_mask_shape()

        # Making buttons and connecting them to functions
        self.dropdown_proj = widgets.Dropdown(
            options=['projection 1', 'projection 2', 'projection 3',
                     'projection 4', 'projection 5'])
        self.dropdown_proj.observe(
            self._dropdown_proj_on_change, names='value')

        self.dropdown_neurons = widgets.Dropdown(options=['all'])
        self.dropdown_neurons.observe(
            self._dropdown_neurons_on_change, names='value')

        self.dropdown_syn_models = widgets.Dropdown(options=self.syn_models)
        self.dropdown_syn_models.observe(
            self._dropdown_syn_models_on_change, names='value')

        self.radio_shape = widgets.RadioButtons(
            options=['rectangle', 'ellipse'])
        self.radio_shape.observe(self._radio_shape_on_clicked, names='value')

        self.radio_type = widgets.RadioButtons(options=['source', 'target'])
        self.radio_type.observe(self._radio_type_on_clicked, names='value')

        """
        self.find_gids_button = widgets.Button(description='Find GIDs')
        self.find_gids_button.on_click(self._find_gids_button_on_clicked)

        self.connect_button = widgets.Button(description='Connect')
        self.connect_button.on_click(self._connect_button_on_clicked)

        self.simulate_button = widgets.Button(description='Simulate')
        self.simulate_button.on_click(self._simulate_button_on_clicked)
        """

        self.save_button = widgets.Button(description='Save')
        self.save_button.on_click(self._save_button_on_clicked)

        self.load_button = widgets.Button(description='Load')
        self.load_button.on_click(self._load_button_on_clicked)

        self.undo_button = widgets.Button(description='Undo')
        self.undo_button.on_click(self._undo_button_on_clicked)

        self.redo_button = widgets.Button(description='Redo')
        self.redo_button.on_click(self._redo_button_on_clicked)

        self.reset_button = widgets.Button(description='Reset')
        self.reset_button.on_click(self._reset_button_on_clicked)

        self.done_button = widgets.Button(description='Done')
        self.done_button.on_click(self._done_button_on_clicked)

        self.undo_button.disabled = True  # Nothing to undo or
        self.redo_button.disabled = True  # redo at initialization

        self.dropdown_neurons.options += self.selector_interaction.get_net_elements()

        self.all_buttons = [self.dropdown_proj,
                            self.radio_shape,
                            self.radio_type,
                            self.dropdown_neurons,
                            self.dropdown_syn_models,
                            self.save_button,
                            self.done_button,
                            self.undo_button,
                            self.redo_button,
                            self.load_button,
                            self.reset_button]
        # Button layout
        radio_buttons_row_1 = widgets.Box([self.dropdown_proj,
                                           self.radio_shape,
                                           self.radio_type],
                                          layout=widgets.Layout(
            #border='solid 1px',
            width='auto',
            display='flex',
            flex_flow='row'
            # justify_content='space_between'
        ))
        radio_buttons_row_2 = widgets.Box([self.dropdown_neurons],
                                          layout=widgets.Layout(
            #border='solid 1px',
            width='auto',
            display='flex',
            flex_flow='row'
            # justify_content='space_between'
        ))

        radio_buttons_row_3 = widgets.Box([self.dropdown_syn_models],
                                          layout=widgets.Layout(
            #border='solid 1px',
            width='auto',
            display='flex',
            flex_flow='row'
            # justify_content='space_between'
        ))

        radio_buttons = widgets.Box([radio_buttons_row_1, radio_buttons_row_2,
                                     radio_buttons_row_3],
                                    layout=widgets.Layout(
            #border='solid 1px',
            width='auto',
            display='flex',
            flex_flow='column'
            # justify_content='space_between'
        ))

        buttons_col_1 = widgets.Box([self.save_button,
                                     self.undo_button,
                                     self.reset_button],
                                    layout=widgets.Layout(
            #border='solid 1px',
            width='auto',
            display='flex',
            flex_flow='column'
            # justify_content='space_between'
        ))
        buttons_col_2 = widgets.Box([self.load_button,
                                     self.redo_button,
                                     self.done_button],
                                    layout=widgets.Layout(
                                    #border='solid 1px',
                                    width='auto',
                                    display='flex',
                                    flex_flow='column'
                                    # justify_content='space_between'
                                    ))

        dp.display(widgets.Box([radio_buttons, buttons_col_1, buttons_col_2],
                               layout=widgets.Layout(
                               display='flex',
                               #border='solid 1px',
                               align_items='stretch',
                               width='60%',
                               justify_content='space-between'
                               )))

    def activate_undo(self):
        self.undo_button.disabled = False

    def _dropdown_proj_on_change(self, label):
        self.selector_interaction.change_projection(label['new'])

    def _dropdown_neurons_on_change(self, label):
        self.selector_interaction.change_neuron_selection(label['new'])

    def _dropdown_syn_models_on_change(self, label):
        self.selector_interaction.change_neuron_selection(label['new'])

    def _radio_shape_on_clicked(self, label):
        self.selector_interaction.change_mask_shape(label['new'])

    def _radio_type_on_clicked(self, label):
        self.selector_interaction.change_mask_type(label['new'])

    def _find_gids_button_on_clicked(self, event):
        self.nest_interface.find_gids(
            self.selector_interaction.selector.get_selections(),
            self.selector_interaction.selector.cprojection)

    def _connect_button_on_clicked(self, event):
        self.nest_interface.connect(
            self.selector_interaction.selector.get_selections())

    def _simulate_button_on_clicked(self, event):
        if self.nest_interface.get_num_connections() == 0:
            print("Cannot simulate; No connections!")
        else:
            self.nest_interface.simulate()

    def _save_button_on_clicked(self, event):
        self.selector_interaction.save()

    def _undo_button_on_clicked(self, event):
        self.selector_interaction.undo()
        self.redo_button.disabled = False
        if len(self.selector_interaction.get_selection_history()) == 0:
            self.undo_button.disabled = True

    def _redo_button_on_clicked(self, event):
        self.selector_interaction.redo()
        self.undo_button.disabled = False
        if len(self.selector_interaction.get_undo_history()) == 0:
            self.redo_button.disabled = True

    def _load_button_on_clicked(self, event):
        self.selector_interaction.load()

    def _reset_button_on_clicked(self, event):
        self.selector_interaction.reset()
        self.nest_interface.reset()
        self.undo_button.disabled = True
        self.redo_button.disabled = True

        if self.nest_interface is not None:
            self.nest_interface.reset()
            self.nest_interface.reset_nest()
            self.nest_interface.make_layers_and_models()
            nest_reset = " and NEST "

        print("App" + nest_reset + "is reset!")


    def _done_button_on_clicked(self, event):
        print("Done button clicked.")
        for button in self.all_buttons:
            button.disabled = True
        plt.close()
