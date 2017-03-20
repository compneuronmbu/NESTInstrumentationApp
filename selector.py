# -*- coding: utf-8 -*-
from __future__ import print_function
import pickle
import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.figure as mplFig
import math
from .GUI.guis import QtGUI
from matplotlib.widgets import RectangleSelector, EllipseSelector


class PointsSelector(object):
    """
    Class for plotting layers, and then selecting areas in the layers. The
    selections specifies connections to be created by NEST. This class can act
    independent of NEST, or be connected to NEST.

    :param layer_spec: From user, dictionary with layer specifications.
    :param models: Optional dictionary with model specifications.
    :param nodesize: Optional specification of the size of the plotted nodes.
                     Default is 20.
    """

    def __init__(self, layer_spec, models=None, syn_models=None,
                 connections=[], nodesize=20):

        self.nodesize = nodesize

        self.unselected_color = 'b'
        self.source_color = 'y'
        self.target_color = 'c'

        self.current_color = self.source_color

        self.oth_source_color = 'darkolivegreen'
        self.oth_target_color = 'darkslateblue'

        self.layer_spec = layer_spec
        self.models = models
        self.syn_models = syn_models
        self.synapse_model = self.syn_models[0][1]
        self.connections = connections

        self.ax_chosen = {}
        self.ax_color = {}

        self.axs_layer_dict = {}
        self.fig = None
        self.fig2 = {}

        self.mask_type = 'rectangle'
        self.connection_type = 'source'
        self.neuron_type = 'all'
        self.cprojection = 'projection 1'
        self.cprojection_list = ['projection 1',
                                 'projection 2',
                                 'projection 3',
                                 'projection 4',
                                 'projection 5']

        self.selection_history = []
        self.undo_history = []

        self.subplot_selector_objects = None

    def set_GUI(self, Interface):
        """
        Sets the GUI class to use when creating the graphical interface.

        :param Interface: GUI class to use.
        """
        selection_interaction = SelectorInteraction(self)
        self.interface = Interface(selection_interaction)

    def _draw_extent(self, ax, xctr, yctr, xext, yext):
        """
        Draws the extent and set aspect ratio and limits.

        :param ax: Axis of the plot.
        :param xctr: x-coordinate of the centre.
        :param yctr: y-coordinate of the centre.
        :param xext: Extent in x-direction.
        :param yext: Extent in y-direction.
        """

        # thin gray line indicating extent
        llx, lly = xctr - xext / 2.0, yctr - yext / 2.0
        urx, ury = llx + xext, lly + yext
        ax.add_patch(
            plt.Rectangle((llx, lly), xext, yext, fc='none', ec='0.5', lw=1,
                          zorder=1))

        # set limits slightly outside extent
        ax.set(aspect='equal',
               xlim=(llx - 0.05 * xext, urx + 0.05 * xext),
               ylim=(lly - 0.05 * yext, ury + 0.05 * yext),
               xticks=tuple(), yticks=tuple())

    def _plot_layers(self, fig=None):
        """
        Plots the layers given by layer_spec. Finds the x- and y-postitions of
        the nodes and plots them. The function creates the figure we work
        on, from which we can choose the points we want.

        :param fig: Figure to plot to. If not set, a figure is created.
        """

        self.fig = fig
        layer_spec = self.layer_spec

        number_of_layers = len(layer_spec)

        if number_of_layers == 2 and isinstance(layer_spec, tuple):
            number_of_layers = 1
            layer_spec = [layer_spec, ]

        # Count how many stimulation devices, recording devices and regular
        # layers we have. This is used when we place the subplots.
        count_layers = 0
        count_rec = 0
        count_stim = 0
        for layer in layer_spec:
            name = layer[0].lower()
            if 'generator' in name:
                count_stim += 1
            elif ('detector' in name or 'meter' in name):
                count_rec += 1
            else:
                count_layers += 1

        it = 0
        # Initial network subplot position
        pos = 2
        # Initial stimulation device subplot position
        stim_pos = 1
        # Initial recording device subplot position
        rec_pos = round(math.sqrt(count_layers)) + 2

        # Determines the number of subplot rows
        row_pos = math.ceil(math.sqrt(count_layers))
        if row_pos < count_rec:
            row_pos = count_rec
        if row_pos < count_stim:
            row_pos = count_stim

        # Number of columns will equal the initial position of recording
        # devices
        no_cols = rec_pos

        for layer in layer_spec:
            name = layer[0]
            try:
                ext = layer[1]['extent']
            except:
                ext = [1., 1.]  # extent is one unless otherwise specified
            try:
                cntr = layer[1]['center']
            except:
                cntr = [0., 0.]  # Center in origo unless otherwise specified

            try:
                # We can either get positions through rows and columns, or
                # through positions vector
                cols = layer[1]['columns']
                rows = layer[1]['rows']

                dx = ext[0] / float(cols)
                dy = ext[1] / float(rows)
                x_start = - (ext[0] / (2.0) - dx / (2.0)) + cntr[0]
                x_end = ext[0] / (2.0) - dx / (2.0) + cntr[0]
                y_start = - (ext[1] / (2.0) - dy / (2.0)) + cntr[1]
                y_end = ext[1] / (2.0) - dy / (2.0) + cntr[1]

                xpos_single = np.linspace(x_start, x_end, cols, endpoint=True)
                # x-positions for all nodes, to be used in scatterplot
                xpos = [x for x in xpos_single for i in range(cols)]

                # GIDs are numbered upwards -> down, while the y-axis has its
                # positive axis upwards, and its negative downwards
                ypos_single = np.linspace(y_end, y_start, rows, endpoint=True)
                ypos = [x for i in range(rows) for x in ypos_single]
            except:
                # Positions through positions vector
                xpos = [x[0] for x in layer[1]['positions']]
                ypos = [y[1] for y in layer[1]['positions']]

            if self.fig is None:
                self.fig = mplFig.Figure()

            # The placement of the layer in the plot depends on whether it is
            # a stimulation device, recording device or normal network layer:
            lower_name = name.lower()
            if 'generator' in lower_name:
                ax = self.fig.add_subplot(row_pos, no_cols, stim_pos)
                stim_pos += no_cols

                pos1 = ax.get_position()  # get the original position
                pos2 = [pos1.x0 - 0.07, pos1.y0, pos1.width, pos1.height]
                ax.set_position(pos2)  # set a new position
            elif ('detector' in lower_name or 'meter' in lower_name):
                ax = self.fig.add_subplot(row_pos, no_cols, rec_pos)
                rec_pos += no_cols

                pos1 = ax.get_position()  # get the original position
                pos2 = [pos1.x0 + 0.06, pos1.y0, pos1.width, pos1.height]
                ax.set_position(pos2)  # set a new position
            else:
                ax = self.fig.add_subplot(row_pos, no_cols, pos)
                if pos == ((no_cols - 1) + it * no_cols):
                    pos += 3
                    it += 1
                else:
                    pos += 1

            ax.set_title(name)
            layer_nodesize = (30 if len(xpos) < 5
                              else self.nodesize)
            ax.scatter(xpos, ypos, s=layer_nodesize,
                       facecolor=self.unselected_color,
                       edgecolor='none')
            self._draw_extent(ax, cntr[0], cntr[1], ext[0], ext[1])

            # Creates dictionary with axis information where the value is a
            # dictionary containg the name of the layer as well as an empty
            # list where we later can store the selected upper_right and
            # lower_left points. Needed when finding GIDs and plotting selected
            # area.
            self.axs_layer_dict[ax] = {}
            self.axs_layer_dict[ax]['selected'] = {}
            self.axs_layer_dict[ax]['name'] = name

            for proj in self.cprojection_list:
                self.axs_layer_dict[ax]['selected'][proj] = []

            # Initialize dictionary to be used when areas are selected. It is
            # created so we don't plot over the subplot unnecessary many times.
            self.ax_chosen[ax] = False
            self.ax_color[ax] = []

        # Name the different columns of the plot
        self.fig.text(0.05, 0.95, 'Stimulation', fontsize=16,
                      fontweight='bold')
        self.fig.text(0.45, 0.95, 'Network', fontsize=16,
                      fontweight='bold')
        self.fig.text(0.80, 0.95, 'Recording', fontsize=16,
                      fontweight='bold')

    def get_synapse_models(self):
        """"""
        synapse_models = []
        for syn_model in self.syn_models:
            synapse_models.append(syn_model[1])

        return synapse_models

    def _choose_mask_shape(self):
        """
        Creates selection objects for all subplots. Creates either rectangle or
        ellipse selectors.
        """
        self.subplot_selector_objects = []
        if self.mask_type == 'rectangle':
            for ax in self.axs_layer_dict:  # iterate through subplot axes
                self.subplot_selector_objects.append(
                    RectangleSelector(ax,
                                      self.store_selection,
                                      useblit=True,
                                      drawtype='box',
                                      interactive=False))
        else:
            for ax in self.axs_layer_dict:  # iterate through subplot axes
                self.subplot_selector_objects.append(
                    EllipseSelector(ax, self.store_selection,
                                    useblit=True,
                                    drawtype='box',
                                    interactive=False))
        self.fig.canvas.draw_idle()  # to not mess up plots when switching

    def update_selected_points(self, ax):
        """
        Replots and colors the selected points in the plot.

        :param ax: Axis object of the plot to update.
        """
        d = ax.collections[0]
        d.set_offset_position('data')
        offsets = d.get_offsets()

        if self.fig2 == {} or not self.ax_chosen[ax]:
            layer_nodesize = (30 if len(offsets) < 5
                              else self.nodesize)
            self.fig2[ax] = ax.scatter([x[0] for x in offsets],
                                       [x[1] for x in offsets],
                                       s=layer_nodesize,
                                       facecolor=self.unselected_color,
                                       edgecolor='none')
            self.ax_chosen[ax] = True

        self.ax_color[ax] = [self.unselected_color] * len(offsets)

        for proj in self.cprojection_list:
            for sel in self.axs_layer_dict[ax]['selected'][proj]:
                # Determines source/target color
                if proj == self.cprojection:
                    if sel[3] == 'source':
                        self.current_color = self.source_color
                    else:
                        self.current_color = self.target_color
                else:
                    if sel[3] == 'source':
                        self.current_color = self.oth_source_color
                    else:
                        self.current_color = self.oth_target_color

                # Get the nodes in the selected area
                if sel[0] == 'rectangle':
                    selected = self.get_selected_rect(ax, sel[1], sel[2])
                else:
                    selected = self.get_selected_ellipse(ax, sel[1], sel[2])

        self.fig2[ax].set_facecolor(self.ax_color[ax])
        try:
            self.fig.canvas.draw_idle()
        except AttributeError:
            # the Notebook backend has issues with draw_idle
            plt.draw()

    def run(self, fig=None, interface=None):
        """
        Runs the PointsSelector in GUI.

        :param fig: Figure to plot to. If not set, a figure is created.
        :param Interface: The graphical user interface class to use. Defaults
                          to the PyQt5 interface.
        """

        # Need to plot layers before initializing the GUI
        self._plot_layers(fig=fig)

        if interface is None:
            self.set_GUI(QtGUI)
        else:
            self.set_GUI(interface)

        self.interface.show()

    def get_selected_rect(self, ax, lower_left, upper_right):
        """
        Get positions of nodes when rectangular shape is chosen.

        :param ax: Axis which is used for selection.
        :param lower_left: Lower left coordinates of the selection.
        :param upper_right: Upper right coordinates of the selection.
        :returns: List of positions of the nodes that are selected.
        """

        d = ax.collections[0]
        d.set_offset_position('data')
        offsets = d.get_offsets()

        is_inside = np.all(np.logical_and(
            lower_left <= offsets, offsets <= upper_right), axis=1)
        selected = offsets[is_inside]

        # Set correct color in chosen area
        for count, t in enumerate(is_inside):
            if t:
                self.ax_color[ax][count] = self.current_color

        return selected

    def get_selected_ellipse(self, ax, lower_left, upper_right):
        """
        Get positions of nodes when elliptical shape is chosen.

        :param ax: Axis which is used for selection.
        :param lower_left: Lower left coordinates of the selection.
        :param upper_right: Upper right coordinates of the selection.
        :returns: List of positions of the nodes that are selected.
        """

        d = ax.collections[0]
        d.set_offset_position('data')
        offsets = d.get_offsets()

        x_side = (upper_right[0] - lower_left[0]) / 2.0
        y_side = (upper_right[1] - lower_left[1]) / 2.0
        center = [(upper_right[0] + lower_left[0]) / 2.0,
                  (upper_right[1] + lower_left[1]) / 2.0]
        selected = []
        for count, p in enumerate(offsets):
            if ((p[0] - center[0])**2 / (x_side * x_side) +
                    (p[1] - center[1])**2 / (y_side * y_side) <= 1):
                selected.append(p)
                # Set the correct color
                self.ax_color[ax][count] = self.current_color

        return selected

    def store_selection(self, eclick, erelease):
        """
        Stores the selected area and updates the plot.

        :param eclick: Matplotlib MouseEvent where the mouse is clicked.
        :param erelease: Matplotlib MouseEvent where the mouse is released.
        """

        if eclick.xdata >= erelease.xdata or eclick.ydata >= erelease.ydata:
            return

        x1, y1 = eclick.xdata, eclick.ydata
        x2, y2 = erelease.xdata, erelease.ydata
        ax = eclick.inaxes

        # test if layer contains selected neuron type
        neuron_types = {'ex': 0, 'in': 0}
        for layer in self.layer_spec:
            if layer[0] == self.axs_layer_dict[ax]['name']:
                if type(layer[1]['elements']) is str:
                    elements = [layer[1]['elements']]
                else:
                    elements = layer[1]['elements']
                for element in elements:
                    if type(element) is int:
                        continue
                    if element[-3:] == 'pyr':
                        neuron_types['ex'] += 1
                    elif element[-2:] == 'in':
                        neuron_types['in'] += 1
                    else:
                        neuron_types['ex'] += 1
                        neuron_types['in'] += 1
                if (self.neuron_type == 'excitatory' and
                        neuron_types['ex'] == 0):
                    print("Only inhibitory neurons in this layer.")
                    valid_selection = False
                elif (self.neuron_type == 'inhibitory' and
                        neuron_types['in'] == 0):
                    print("Only excitatory neurons in this layer.")
                    valid_selection = False
                else:
                    valid_selection = True
        if valid_selection:
            # Collect selected upper_right and lower_left points in list.
            # Used when finding the GIDs in the selected areas, as well as when
            # plotting areas.
            selection_data = [self.mask_type,
                              [eclick.xdata, eclick.ydata],
                              [erelease.xdata, erelease.ydata],
                              self.connection_type,
                              self.neuron_type,
                              self.synapse_model]
            self.axs_layer_dict[ax]['selected'][self.cprojection].append(
                selection_data)
            self.selection_history.append([ax, self.cprojection,
                                           selection_data])

            print("\nSelected points: (%3.f, %3.2f) --> (%3.2f, %3.2f)" %
                  (x1, y1, x2, y2))
            print("[[%3.4f, %3.4f, %3.4f, %3.4f, '%s'], '%s', '%s']" %
                  (x1, y1, x2, y2, self.axs_layer_dict[ax]['name'],
                   self.mask_type, self.neuron_type))
            self.update_selected_points(ax)

    def _make_out_dict(self):
        """
        Creates a selection dictionary that can be exported.

        :returns: Dictionary of the selections.
        """
        out_dict = {}
        for ax, layer_dict in self.axs_layer_dict.items():
            name = layer_dict['name']
            out_dict[name] = {}
            for proj in self.cprojection_list:
                # if len((self.axs_layer_dict[ax]
                #        ['selected'][proj])) > 0:
                out_dict[name][proj] = layer_dict['selected'][proj]
        return out_dict

    def get_selections(self):
        """
        Gets the selection dictionary.

        :returns: Dictinary of the selections.
        """
        return self._make_out_dict()

    def get_net_elements(self):
        element_list = []
        for layer in self.layer_spec:
            if ('Generator' in layer[0] or
                'Detector' in layer[0] or
                    'meter' in layer[0]):
                continue
            try:
                elements = layer[1]['elements']
            except KeyError:  # for synapse model
                continue
            if type(elements) is str:
                element_list.append(elements)
            elif type(elements) is list:
                for item in elements:
                    if type(item) is str:
                        element_list.append(item)
        return element_list

    # def connect_to_nest(self, print_time=False):
    #     """
    #     Connects to the LayerSelectAndConnect class that interfaces with
    #     NEST.
    #     """
    #     from .nest_interface import NESTInterface
    #     self.LSC = NESTInterface(self.layer_spec, self.models)

    def reset(self):
        """
        Resets the selections.
        """
        for ax, layer_dict in self.axs_layer_dict.items():
            if ax in self.fig2:
                self.fig2[ax].set_facecolor(self.unselected_color)
            for proj in self.cprojection_list:
                layer_dict['selected'][proj] = []


class SelectorInteraction(object):
    """
    This class interfaces with PointsSelector, acting as a bridge for the GUI.

    :param Selector: The PointsSelector class to connect to.
    """

    def __init__(self, selector):
        self.selector = selector

    def get_net_elements(self):
        return self.selector.get_net_elements()

    def change_mask_type(self, mask_type):
        """
        Changes the mask type. Valid types are ``source`` and ``target``.

        :param mask_type: Type of mask as a string.
        """
        # print("Selected", mask_type)
        self.selector.connection_type = mask_type

    def change_mask_shape(self, shape):
        """
        Changes the mask shape. Valid shapes are ``rectangle`` and ``ellipse``.

        :param shape: Shape of the mask.
        """
        self.selector.mask_type = shape
        self.selector._choose_mask_shape()

    def change_neuron_selection(self, neuron_type):
        """
        Changes the neuron type. Valid types are ``all``, ``excitatory``, and
        ``inhibitory``.

        :param neuron_type: Neuron type to select.
        """
        self.selector.neuron_type = neuron_type

    def change_projection(self, projection):
        """
        Changes the projection. Valid projections are on the form
        ``projection x``, where ``x`` is the number of the projection.

        :param projection: Projection to change to.
        """
        # print("\nSelected %s \n" % projection)
        self.selector.cprojection = projection
        for ax in self.selector.axs_layer_dict:
            for proj in self.selector.cprojection_list:
                if self.selector.axs_layer_dict[ax]['selected'][proj] != []:
                    self.selector.update_selected_points(ax)
                    continue

    def change_syn_model(self, syn_model):
        self.selector.synapse_model = syn_model

    def undo(self):
        """
        Undoes the previous selection.
        """
        ax = self.selector.selection_history[-1][0]
        cprojection = self.selector.selection_history[-1][1]
        self.selector.undo_history.append(
            [ax, cprojection,
             self.selector.axs_layer_dict[ax]['selected'][cprojection][-1]])
        del self.selector.axs_layer_dict[ax]['selected'][cprojection][-1]
        del self.selector.selection_history[-1]
        self.selector.update_selected_points(ax)

    def redo(self):
        """
        Redoes the selection that was previously undone.
        """
        ax = self.selector.undo_history[-1][0]
        cprojection = self.selector.undo_history[-1][1]
        selected = self.selector.undo_history[-1][2]
        self.selector.axs_layer_dict[ax]['selected'][cprojection].append(
            selected)
        self.selector.selection_history.append([ax, cprojection, selected])
        del self.selector.undo_history[-1]
        self.selector.update_selected_points(ax)

    # def connect_to_nest(self):
    #     """
    #     Makes the PointsSelector class connect to NEST.
    #     """
    #     self.selector.connect_to_nest(print_time=True)

    def save(self):
        """
        Saves the current selection collection.
        """
        out_dict = self.selector.get_selections()
        with open('outfile.pkl', 'wb') as outfile:
            pickle.dump(out_dict, outfile)

    def load(self):
        """
        Loads selection collection from file and merges it with the current
        selection.
        """
        try:
            with open('outfile.pkl', 'rb') as infile:
                in_dict = pickle.load(infile)
            for ax in self.selector.axs_layer_dict:
                name = self.selector.axs_layer_dict[ax]['name']
                loaded_points = False
                if name in in_dict:
                    for proj in self.selector.cprojection_list:
                        if proj in in_dict[name]:
                            for selected in in_dict[name][proj]:
                                (self.selector.axs_layer_dict[ax]['selected']
                                    [proj].append(selected))
                            loaded_points = True
                if loaded_points:  # if no new point, don't update plot
                    self.selector.update_selected_points(ax)
        except IOError:
            print("There is no saved file.")

    def reset(self):
        """
        Resets the selections in all layers and removes found GIDs in the
        NEST interface.

        :todo: Undoing after reseting creates unexpected behaviour.
        """

        self.selector.reset()

        if self.selector.connection_type != 'source':
            # TODO: button should also be reset
            self.selector.connection_type = 'source'

        self.selector.fig.canvas.draw_idle()

    def close(self):
        sys.exit()
        # TODO: dialog
