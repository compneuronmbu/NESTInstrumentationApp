from __future__ import print_function
import matplotlib.pyplot as plt
import ipywidgets as widgets
import IPython.display as dp


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

        selector = self.selector_interaction.selector
        self.syn_models = selector.get_synapse_models()

        self.make_GUI()

    def show(self):
        """
        Shows the GUI.
        """
        plt.show()

    def make_GUI(self):
        """
        Sets up the GUI by initializing the selectors and connecting
        callbacks for the buttons.
        """
        self.selector_interaction.selector.set_mask_shape()

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

        self.dropdown_neurons.options += (
            self.selector_interaction.get_net_elements())

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

    def warning_message(self, message):
        print(message)

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

        nest_reset = " "
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
