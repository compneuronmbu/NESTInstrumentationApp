# -*- coding: utf-8 -*-
from __future__ import print_function
import nest
import nest.topology as tp
import nest.voltage_trace
import array
import numpy
import matplotlib.pyplot as plt


class NESTInterface(object):
    """
    Class for creating layers, finding GIDs, connecting selections and running
    simulations.

    :param layer_spec: From user, dictionary with layer specifications.
    :param models: Optional dictionary with model specifications.
    """

    def __init__(self, layer_spec, models=None):
        self.layer_spec = layer_spec
        self.models = models

        self.connection_selection_dict = None
        self.layer_dict = {}

        self.spike_detectors = {}
        self.recorders = []

        self.mask_number = {}  # For testing purposes.

        self.make_layers_and_models()

    def make_layers_and_models(self):
        """
        Makes layers and models from specifications given at initialization.
        """
        if self.models is not None:
            self._model_creator()
        self._layer_creator()

    def _layer_creator(self):
        """
        Creates layers defined in layer_spec.
        """
        for l in self.layer_spec:
            self.layer_dict[l[0]] = tp.CreateLayer(l[1])

    def _model_creator(self):
        """
        Creates models from specifications.

        :param models: Nested list of model specifications.
        """
        for m in self.models:
            nest.CopyModel(m[0], m[1], m[2])

    def connect(self, selection_dict, all_connections):
        """
        Makes connections from selections specified by the user.

        :param selection_dict: Dictionary of the selections.
        """
        for conn in all_connections:
            tp.ConnectLayers(self.layer_dict[conn[0]],
                             self.layer_dict[conn[1]],
                             conn[2])

        # TODO: there is a more efficient way to do this..
        self.connection_selection_dict = selection_dict
        # Get list of all projections
        proj_list = []
        for layer_name, selections in selection_dict.items():
            for proj in selections:
                if proj not in proj_list:
                    proj_list.append(proj)

        # Find out if we have spike detector or membrane recorder
        recorder_name_list = []
        for layer in self.layer_spec:
            if not isinstance(layer[1]['elements'], list):
                elements = [layer[1]['elements'], ]
            else:
                elements = layer[1]['elements']
            for model in elements:
                if (isinstance(model, str) and
                        'record_from' in nest.GetDefaults(model)):
                    recorder_name_list.append(layer[0])

        # For each projection, make the connections
        for projection in proj_list:
            source_gid_dict, target_gid_dict = self._get_gids(
                selection_dict, projection)

            print("To connect:", source_gid_dict, target_gid_dict)

            for post_layer_name in target_gid_dict:
                if 'detector' in post_layer_name.lower():
                    self.spike_detectors[post_layer_name] = target_gid_dict[
                        post_layer_name]

            print("Connecting..")
            for pre_layer_name in source_gid_dict:
                if pre_layer_name in recorder_name_list:
                    self.recorders.append(
                        (pre_layer_name, source_gid_dict[pre_layer_name]))
                for post_layer_name in target_gid_dict:
                    syn_spec = (
                        selection_dict[post_layer_name][projection][0][5]
                        if not(pre_layer_name in recorder_name_list)
                        else 'static_synapse')
                    if post_layer_name in recorder_name_list:
                        print(post_layer_name, " must be source, switching "
                              "source and target!")
                        self.recorders.append((
                            post_layer_name,
                            target_gid_dict[post_layer_name]))
                        nest.Connect(target_gid_dict[post_layer_name],
                                     source_gid_dict[pre_layer_name],
                                     syn_spec='static_synapse')
                    else:
                        print("%s and %s" %
                              (pre_layer_name, post_layer_name))
                        nest.Connect(source_gid_dict[pre_layer_name],
                                     target_gid_dict[post_layer_name],
                                     syn_spec=syn_spec)
            print("Number of connections: %i" %
                  self.get_num_connections())

    def simulate(self, simtime=100, make_plot=False, print_time=False):
        """
        Run simulation.

        :param simtime: Time to run the simulation, in ms.
        :param make_plot: If ``True``, makes a plot of the spiketrain.
        :param print_time: Turn printing on or off for the simulation.
        """

        nest.SetKernelStatus({'print_time': print_time})

        nest.Simulate(simtime)

        fig_counter = 1
        for spike_det_name, spike_det in self.spike_detectors.items():
            n_spikes = nest.GetStatus(spike_det)[0]['n_events']
            events = nest.GetStatus(spike_det)[0]['events']
            print("Number of spikes: %i" % n_spikes)

            if make_plot and n_spikes > 0:
                event_fig = plt.figure(fig_counter)
                plt.plot(events['times'],
                         events['senders'] - min(events['senders']), 'o')
                plt.yticks([])
                plt.title("Spike train given by %s" % spike_det_name)
                plt.xlabel('time [ms]')
                plt.ylabel('nodes')
                event_fig.show()
            fig_counter += 1

        for recorder in self.recorders:
            if make_plot:
                plt.figure(fig_counter)
                self._plot_recorder(recorder[1])
                plt.title("Membrane potential given by %s" % recorder[0])
                plt.show()
                fig_counter += 1

    def _plot_recorder(self, recorder_gid):

        if len(recorder_gid) > 1:
            raise nest.NESTError("Please provide a single voltmeter.")

        ev = nest.GetStatus(recorder_gid, 'events')[0]
        potentials = ev['V_m']
        senders = ev['senders']

        voltages = {}
        time = {}

        if 'times' in ev:
            times = ev['times']
            for s, currentsender in enumerate(senders):
                if currentsender not in voltages:
                    voltages[currentsender] = array.array('f')
                    time[currentsender] = array.array('f')

                voltages[currentsender].append(float(potentials[s]))
                time[currentsender].append(float(times[s]))
        else:
            # reconstruct the time vector, if not stored explicitly
            detec_status = nest.GetStatus(recorder_gid)[0]
            origin = detec_status['origin']
            start = detec_status['start']
            interval = detec_status['interval']
            senders_uniq = numpy.unique(senders)
            num_intvls = len(senders) / len(senders_uniq)
            times_s = origin + start + interval + \
                interval * numpy.array(range(num_intvls))

            for s, currentsender in enumerate(senders):
                if currentsender not in voltages:
                    voltages[currentsender] = array.array('f')
                    time[currentsender] = times_s
                voltages[currentsender].append(float(potentials[s]))

        neurons = voltages.keys()

        plotids = []
        for neuron in neurons:
            time_values = numpy.array(time[neuron])
            line_style = ""
            try:
                plotids.append(
                    plt.plot(time_values, voltages[neuron],
                             line_style, label="Neuron %i" % neuron))
            except KeyError:
                print("INFO: Wrong ID: {0}".format(neuron))

        # plt.title("Membrane potential")
        plt.ylabel("Membrane potential [mV]")
        if nest.GetStatus(recorder_gid)[0]['time_in_steps']:
            plt.xlabel("Steps")
        else:
            plt.xlabel("Time [ms]")

        plt.draw()

    def _make_mask(self, lower_left, upper_right, mask_type, cntr):
        """
        Makes a mask from the specifications.

        :param lower_left: Coordinates for lower left of the selection.
        :param upper_right: Coordinates for upper right of the selection.
        :param mask_type: Shape of the mask. Either ``rectangle`` or
                          ``ellipse``.
        :param cntr: Coordinates for the center of the layer.
        :returns: A NEST ``Mask`` object.
        """

        if mask_type == 'rectangle':
            mask_t = 'rectangular'
            spec = {'lower_left': [lower_left[0] - cntr[0],
                                   lower_left[1] - cntr[1]],
                    'upper_right': [upper_right[0] - cntr[0],
                                    upper_right[1] - cntr[1]]}
        elif mask_type == 'ellipse':
            mask_t = 'elliptical'
            # Calculate center of ellipse
            xpos = (upper_right[0] + lower_left[0]) / 2.0
            ypos = (upper_right[1] + lower_left[1]) / 2.0
            # Find major and minor axis
            x_side = upper_right[0] - lower_left[0]
            y_side = upper_right[1] - lower_left[1]
            if x_side >= y_side:
                angle = 0.0
                major = x_side
                minor = y_side
            else:
                angle = 90.
                major = y_side
                minor = x_side
            spec = {'major_axis': major, 'minor_axis': minor,
                    'anchor': [xpos - cntr[0], ypos - cntr[1]],
                    'azimuth_angle': angle}
        else:
            raise ValueError('Invalid mask type: %s' % mask_type)

        mask = tp.CreateMask(mask_t, spec)

        return mask

    def _overlapped(self, lower_left_list, upper_right_list, ll, ur,
                    source_target_list, mask_type_list, node_type_list):
        """
        Checks if a mask specified by ``ll`` and ``ur`` overlaps with masks
        specified by ``lower_left_list`` and ``upper_right_list``.

        :param lower_left_list: List of lower left coordinates of other masks
        :param upper_right_list: List of upper_right coordinates of other masks
        :param ll: Lower left coordinates of given mask
        :param ur: Upper right coordinates of given mask
        :param source_target_list: List of source/target specifications of
                                   all masks
        :param mask_type_list: List of mask type specifications of all masks
        :param node_type_list: List of node type specifications of all masks.
        :returns: List of masks that overlaps with the given mask
        """

        indx = []

        # source or target of given mask.
        present_source_target = source_target_list[len(source_target_list) - 1]
        # mask type of given mask
        present_mask_type = mask_type_list[len(mask_type_list) - 1]
        # node type of given mask
        present_node_type = node_type_list[len(node_type_list) - 1]

        # Go through all masks given by lower_left_list, upper_right_list and
        # check if mask given by ll, ur overlaps with any of the masks:
        for i in range(len(lower_left_list) - 1):
            # Lower left coordinates of mask we currently test for overlap
            ll_A = lower_left_list[i]
            # Lower left coordinate of main mask
            ll_B = ll
            ur_A = upper_right_list[i]
            ur_B = ur

            # Source or target and mask_type of mask we currently tests for
            # overlap
            source_target = source_target_list[i]
            mask_type = mask_type_list[i]
            node_type = node_type_list[i]

            # Test if we have overlap if both masks are rectangle type and
            # have same source/target type. If so, we store the mask index.
            if ((present_mask_type == 'rectangle') and
                (mask_type == 'rectangle') and
                (ll_A[0] < ur_B[0]) and
                (ll_A[1] < ur_B[1]) and
                (ur_A[0] > ll_B[0]) and
                (ur_A[1] > ll_B[1]) and
                (present_source_target == source_target) and
                    present_node_type == node_type):
                indx.append(i)
            # Test if we have overlap if both masks are ellipse type and
            # have same source/target type. Currently don't have this
            # implemented.
            elif ((present_mask_type == 'ellipse') and
                  (mask_type == 'ellipse') and
                  (present_source_target == source_target) and
                  present_node_type == node_type):
                pass
            # Test if we have overlap if main mask is rectangle and current
            # loop mask is ellipse, and the source/target type is the same.
            elif ((present_mask_type == 'rectangle') and
                  (mask_type == 'ellipse') and
                  (present_source_target == source_target) and
                  present_node_type == node_type):
                lr = [ur[0], ll[1]]
                ul = [ll[0], ur[1]]
                # Center coordinates of ellipse
                cntr = [(ur_A[0] + ll_A[0]) / 2.0, (ur_A[1] + ll_A[1]) / 2.0]
                # Semi major/minor axis of ellipse
                x_side = (ur_A[0] - ll_A[0]) / 2.0
                y_side = (ur_A[1] - ll_A[1]) / 2.0

                # Test if the corners of the rectangle is inside the ellipse.
                # If so, the masks overlap, and we store the current loop mask
                # index.
                if (((ll[0] - cntr[0])**2 / x_side**2 +
                     (ll[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((lr[0] - cntr[0])**2 / x_side**2 +
                     (lr[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((ur[0] - cntr[0])**2 / x_side**2 +
                     (ur[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((ul[0] - cntr[0])**2 / x_side**2 +
                     (ul[1] - cntr[1])**2 / y_side**2 <= 1)):
                    indx.append(i)
            # Test if we have overlap if main mask is ellipse and current
            # loop mask is rectangle, and the source/target type is the same.
            elif ((present_mask_type == 'ellipse') and
                  (mask_type == 'rectangle') and
                  (present_source_target == source_target) and
                  present_node_type == node_type):
                lr = [ur_A[0], ll_A[1]]
                ul = [ll_A[0], ur_A[1]]
                cntr = [(ur[0] + ll[0]) / 2.0, (ur[1] + ll[1]) / 2.0]
                x_side = (ur[0] - ll[0]) / 2.0
                y_side = (ur[1] - ll[1]) / 2.0

                if (((ll_A[0] - cntr[0])**2 / x_side**2 +
                     (ll_A[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((lr[0] - cntr[0])**2 / x_side**2 +
                     (lr[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((ur_A[0] - cntr[0])**2 / x_side**2 +
                     (ur_A[1] - cntr[1])**2 / y_side**2 <= 1) or
                    ((ul[0] - cntr[0])**2 / x_side**2 +
                     (ul[1] - cntr[1])**2 / y_side**2 <= 1)):
                    indx.append(i)

        return indx

    def _create_overlapped_mask(self, mask1, mask2):
        """
        Creates a mask from two overlapping masks.

        :param mask1: First mask to join.
        :param mask2: Second mask to join.
        :returns: A NEST ``Mask`` object.
        """
        overlapped_mask = mask1 | mask2
        return overlapped_mask

    def _get_gids(self, selection_dict, projection):
        """
        Finds the GIDs in selected areas.

        :param selection_dict: Dictionary of the selections.
        :param projection: Projection in which to find the GIDs.
        :returns: Dictionary containing selected source GIDs for each layer,
                  dictionary containing selected target GIDs for each layer.
        """

        source_gid_dict = {}
        target_gid_dict = {}
        for layer_name in selection_dict:  # iterate through all subplots
            # Don't need to go through current subplot if nothing is selected
            if len(selection_dict[layer_name][projection]) == 0:
                continue

            for spec in self.layer_spec:
                # Find the correct layer in layer_spec so we can calculate
                # limits
                if spec[0] == layer_name:
                    try:
                        cntr = spec[1]['center']
                    except KeyError:
                        # Center in origo unless otherwise specified
                        cntr = [0.0, 0.0]
                    try:
                        ext = spec[1]['extent']
                    except KeyError:
                        # Extent is one unless otherwise specified
                        ext = [1., 1.]

                    x_limit_start = - ext[0] * 0.5 + cntr[0]
                    x_limit_end = ext[0] * 0.5 + cntr[0]
                    y_limit_start = - ext[1] * 0.5 + cntr[1]
                    y_limit_end = ext[1] * 0.5 + cntr[1]
                    break

            ll_list = []
            ur_list = []
            mask_list = []
            mask_list2 = []
            source_target_list = []
            source_target = {}
            mask_type_list = []
            node_type_list = []

            # Iterate through selected points in the subplot and find the GIDs
            for selected in selection_dict[layer_name][projection]:
                mask_type = selected[0]
                ll = selected[1]
                ur = selected[2]
                connection_type = selected[3]

                mask_type_list.append(mask_type)
                node_type_list.append(selected[4])

                # Need to restrict lower_left and upper_right to not exceed the
                # extents
                if ll[0] < x_limit_start:
                    ll[0] = x_limit_start
                if ll[1] < y_limit_start:
                    ll[1] = y_limit_start

                if ur[0] > x_limit_end:
                    ur[0] = x_limit_end
                if ur[1] > y_limit_end:
                    ur[1] = y_limit_end

                ll_list.append(ll)
                ur_list.append(ur)

                # Initialize gid dictionaries that we return in the end
                if connection_type == 'source':
                    # TODO: This happens more than once
                    source_gid_dict[layer_name] = ()
                else:
                    target_gid_dict[layer_name] = ()

                source_target_list.append(connection_type)

                # Create mask
                # TODO:This whole process can probably be done more efficiently
                mask = self._make_mask(ll, ur, mask_type, cntr)

                # Find the index of all masks the current mask overlap with.
                # The other masks consist of the previous masks in the
                # for-loop.
                indx_list = self._overlapped(ll_list, ur_list, ll, ur,
                                             source_target_list,
                                             mask_type_list,
                                             node_type_list)

                # mask_list2 contains as many masks as are made in the plot.
                # The first mask is placed in the first position of the list,
                # the second in the second and so on. If the masks overlap, a
                # new, overlapped mask will be created. This mask will replace
                # all the masks in the list used to create the new mask. So, if
                # mask 2, 3 and 5 overlap, mask_list2[2-1] = mask_list2[3-1] =
                # mask_list2[6-1] (python indexing start at zero).

                # mask_list is the list we will go through in the end to find
                # the GIDs. So if masks overlap, it is only placed in the list
                # once. If a mask does not overlap with any other masks, it
                # will simply be added to the list.
                mask_list2.append(mask)
                mask_list.append(mask)

                # If we have overlap, we need to create an overlapped-mask:
                if indx_list != []:
                    for indx in indx_list:
                        mask_old = mask_list2[indx]
                        mask_old_present = mask

                        # This creates unnecessary masks
                        mask = self._create_overlapped_mask(mask_old, mask)
                        mask_list.remove(mask_old)
                        if mask_old != mask_old_present:
                            mask_list.remove(mask_old_present)

                        for i in range(len(mask_list2)):
                            if mask_list2[i] == mask_old:
                                mask_list2[i] = mask
                            if mask_list2[i] == mask_old_present:
                                mask_list2[i] = mask
                        mask_list.append(mask)

                # TODO: We don't need all of these.
                # Stores the connection type of the created mask.
                source_target[mask] = [connection_type, node_type_list[-1]]

            for mask in mask_list:
                # Find the GIDs
                gids = tp.SelectNodesByMask(self.layer_dict[layer_name],
                                            cntr, mask)

                # Ignore GIDs if they are of unwanted neuron type
                if ((source_target[mask][1] != 'all') and
                    'generator' not in layer_name.lower() and
                    'detector' not in layer_name.lower() and
                        'meter' not in layer_name.lower()):
                    gids = [gid for gid in gids if source_target[mask][1] ==
                            nest.GetStatus([gid])[0]['model']]
                    gids = tuple(gids)

                if source_target[mask][0] == 'source':
                    source_gid_dict[layer_name] += gids
                else:
                    target_gid_dict[layer_name] += gids

            self.mask_number[layer_name] = len(mask_list)

        return source_gid_dict, target_gid_dict

    def get_gids(self, selection_dict, projection):
        """
        Function used to find GIDs.

        :param selection_dict: Dictionary of the selections.
        :param projection: Projection in which to find the GIDs.
        """
        return self._get_gids(selection_dict, projection)

    def find_gids(self, selections, projection):
        """
        Finds the GIDs in the selected area(s).

        :returns: Dictionary containing selected source GIDs for each layer,
                  dictionary containing selected target GIDs for each layer.

        """

        source_gid_dict, target_gid_dict = self.get_gids(selections,
                                                         projection)

        print("Projection:", projection)
        print("Source GIDs:")
        for index in source_gid_dict:
            print("#####################")
            print("Layer name:", index)
            print("Type: source")
            print("GIDs:")
            print(source_gid_dict[index])
            print("")
        print("Target GIDs:")
        for index in target_gid_dict:
            print("#####################")
            print("Layer name:", index)
            print("Type: target")
            print("GIDs:")
            print(target_gid_dict[index])
            print("")

        return source_gid_dict, target_gid_dict

    def reset(self):
        """
        Empties dictionaries containing GIDs.
        """
        self.source_gid_dict = {}
        self.target_gid_dict = {}
        self.spike_detectors = {}
        self.need_to_create_spike_detector = True
        self.recorders = []

    def reset_nest(self):
        """
        Resets NEST.
        """
        nest.ResetKernel()

    def get_mask_number(self):
        """
        Gets number of masks.

        :returns: Number of masks.
        """
        return self.mask_number

    def get_num_connections(self):
        """
        Gets number of connections in NEST.

        :returns: Number of connections.
        """
        return nest.GetKernelStatus()['num_connections']
