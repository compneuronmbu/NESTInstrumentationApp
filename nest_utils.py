# -*- coding: utf-8 -*-
import time
import math
import os
import sys
import threading
# import nest
# import nest.topology as tp
import numbers
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm

#nett.initialize('tcp://127.0.0.1:2001')
if os.name == 'posix' and sys.version_info[0] < 3:
    # A backport of the subprocess module from Python 3.2/3.3 for Python 2.x
    try:
        import subprocess32 as sp
    except ImportError:
        print('Module subprocess32 not found, using old subprocess module.')
        import subprocess as sp
else:
    import subprocess as sp


class observe_slot(threading.Thread):

    def __init__(self, slot, message_type, callback):
        super(observe_slot, self).__init__()
        self.slot = slot
        self.msg = message_type
        self.last_message = None
        self.state = False
        self.last_message = None
        self.callback = callback

    def get_last_message(self):
        return self.last_message

    def set_state(self, state):
        self.state = state

    def run(self):
        while True:
            self.msg.ParseFromString(self.slot.receive())
            if self.msg.value is not None:
                self.last_message = self.msg.value
                self.callback(self.msg)
            self.state = not self.state
            self.last_message = self.msg

class NESTInterface(object):
    """
    Class for interacting with NEST.

    :param networkSpecs: Dictionary of network specifications
    :param synapses: Optional list of synapse specifications
    :param internal_projections: Optional list of projections between layers
    :param device_projections: Optional list of projections between layers and
                               devices
    """

    def __init__(self, networkSpecs,
                 synapses=None,
                 internal_projections=None,
                 device_projections=None):
        self.networkSpecs = networkSpecs
        self.synapses = synapses
        self.internal_projections = internal_projections
        self.device_projections = device_projections

        self.layers = {}
        self.rec_devices = []

        nett.initialize('tcp://127.0.0.1:2001')

        self.slot_out_reset = nett.slot_out_float_message('reset')
        self.slot_out_network = nett.slot_out_string_message('network')

        self.client_complete = False
        self.slot_in_complete = nett.slot_in_float_message()
        self.slot_in_complete.connect('tcp://127.0.0.1:8000', 'task_complete')
        self.observe_slot_ready = observe_slot(self.slot_in_complete,
                                          fm.float_message(),
                                          self.handle_complete)
        self.observe_slot_ready.start()

        self.start_nest_client()
        self.wait_until_client_finishes()
        self.reset_kernel()
        self.make_network()
        if synapses:
            self.make_synapse_models()

        # nest.set_verbosity("M_ERROR")
        # nest.sr("M_ERROR setverbosity")  # While set_verbosity function is broken.

    def start_nest_client(self):
        self.client = sp.Popen(['python', 'nest_client.py'])
        print('NEST client started')

    def terminate_nest_client(self):
        self.client.terminate()
        print('NEST client terminated')
        # self.observe_slot_ready.alive = False
        # self.observe_slot_ready.join()
        # print('Joined observe thread')

    def handle_complete(self, msg):
        print('Received complete signal')
        self.client_complete = True

    def reset_complete(self):
        self.client_complete = False

    def wait_until_client_finishes(self):
        while not self.client_complete:
            print('Waiting for client...')
            time.sleep(0.2)

    def reset_kernel(self):
        """
        Resets the NEST kernel.
        """
        # nest.ResetKernel()
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_reset.send(msg.SerializeToString())
        print('Sent reset')

    def make_network(self):
        """
        Creates the layers and models of nodes.
        """
        msg = sm.string_message()
        msg.value = self.networkSpecs
        self.slot_out_network.send(msg.SerializeToString())
        print('Sent make network')

    def make_mask(self, lower_left, upper_right, mask_type, azimuth_angle, polar_angle, cntr):
        """
        Makes a mask from the specifications.

        :param lower_left: Coordinates for lower left of the selection.
        :param upper_right: Coordinates for upper right of the selection.
        :param mask_type: Shape of the mask. Either ``rectangle`` or
                          ``ellipse``.
        :param azimuth_angle: Rotation angle in degrees from x-axis.
        :param polar_angle: Rotation angle in degrees from z-axis.
        :param cntr: Coordinates for the center of the layer.
        :returns: A NEST ``Mask`` object.
        """

        if mask_type == 'rectangular':
            spec = {'lower_left': [lower_left[0] - cntr[0],
                                   lower_left[1] - cntr[1]],
                    'upper_right': [upper_right[0] - cntr[0],
                                    upper_right[1] - cntr[1]],
                    #'azimuth_angle': azimuth_angle
                    }
        elif mask_type == 'elliptical':
            # Calculate center of ellipse
            xpos = (upper_right[0] + lower_left[0]) / 2.0
            ypos = (upper_right[1] + lower_left[1]) / 2.0
            # Find major and minor axis
            x_side = upper_right[0] - lower_left[0]
            y_side = upper_right[1] - lower_left[1]
            if x_side >= y_side:
                major = x_side
                minor = y_side
            else:
                major = y_side
                minor = x_side
            spec = {'major_axis': major, 'minor_axis': minor,
                    'anchor': [xpos - cntr[0], ypos - cntr[1]],
                    'azimuth_angle': azimuth_angle
                    }
        elif mask_type == 'box':
            spec = {'lower_left': [lower_left[0] - cntr[0],
                                   lower_left[1] - cntr[1],
                                   lower_left[2]],
                    'upper_right': [upper_right[0] - cntr[0],
                                    upper_right[1] - cntr[1],
                                    upper_right[2]],
                    # 'azimuth_angle': azimuth_angle,
                    # 'polar_angle': polar_angle
                    }
        elif mask_type == 'ellipsoidal':
            # Calculate center of ellipse
            xpos = (upper_right[0] + lower_left[0]) / 2.0
            ypos = (upper_right[1] + lower_left[1]) / 2.0
            zpos = (upper_right[2] + lower_left[2]) / 2.0
            # Find major and minor axis
            x_side = upper_right[0] - lower_left[0]
            y_side = upper_right[1] - lower_left[1]
            z_side = upper_right[2] - lower_left[2]
            if x_side >= y_side:
                major = x_side
                minor = y_side
            else:
                major = y_side
                minor = x_side
            spec = {'major_axis': major, 'minor_axis': minor,
                    'polar_axis': z_side,
                    'anchor': [xpos - cntr[0], ypos - cntr[1], zpos],
                    'azimuth_angle': azimuth_angle,
                    'polar_angle': polar_angle}
        else:
            raise ValueError('Invalid mask type: %s' % mask_type)

        mask = tp.CreateMask(mask_type, spec)

        return mask

    def make_synapse_models(self):
        """
        Makes custom synapse models.
        """
        for syn_name, model_name, syn_specs in self.synapses:
            nest.CopyModel(syn_name, model_name, syn_specs)

    def get_gids(self, selection_dict):
        """
        Gets a list of the selected GIDs.

        :param selection_dict: Dictionary containing specifications of the
                               selected areas.
        :returns: List of the selected GIDs
        """
        layer_names = selection_dict['name']
        selection = selection_dict['selection']
        mask_type = selection_dict['maskShape']
        neuron_type = selection_dict['neuronType']
        azimuth_angle = float(selection_dict['azimuthAngle']) * 180 / math.pi
        if 'polarAngle' in selection_dict:
            polar_angle = float(selection_dict['polarAngle']) * 180 / math.pi
        else:
            polar_angle = 0.0

        ll = [selection['ll']['x'], selection['ll']['y'], selection['ll']['z']]
        ur = [selection['ur']['x'], selection['ur']['y'], selection['ur']['z']]

        # TODO: There must be a better way to do this. Also, center in origo is not always correct. Also, does SelectNodesByMask
        # really need to be sent cntr? Could it work if we said that it start in origo at c++ level? What happens if layer is outside origo?
        if ( ll[2] == ur[2] ):
            cntr = [0.0, 0.0]
        else:
            cntr = [0.0, 0.0, 0.0]
        mask = self.make_mask(ll, ur, mask_type, azimuth_angle, polar_angle, cntr)

        collected_gids = []
        # TODO: Think we might be able to use only one of these for-loops, the last one. And then check if layer['name'] is in layer_names
        # In case of a 3D layer, we have to go through all the layer names in the selection_dict, because we only have one dict
        # for the selection, but the area might encompass several layers.
        for name in layer_names:
            gids = tp.SelectNodesByMask(self.layers[name],
                                        cntr, mask)

            # If we have chosen neuron_type All, we return all the GIDs.
            if neuron_type == "All":
                collected_gids += gids
                continue

            # If we have chosen a spesific neuron_type, we have to find the correct GIDs. To do this, we have to go through
            # all the layers and compare to the type we have chosen.
            for layer in self.networkSpecs['layers']:
                if name == layer['name']:
                    # All the elements in the selected layer
                    models = layer['elements']

                    # If neuron_type is in models, the layer contains the chosen neuron_type,
                    # and we must find the correct GIDs. 
                    if neuron_type in models:
                        # If models is not a list, the layer contains only one element type, we have chosen
                        # this type and the found GIDs are the GIDs of the chosen element type.
                        if not isinstance(models, list):
                            collected_gids += gids
                            continue

                        # If models is a list, we need to find how many positions we have chosen in the mask, how many nodes the
                        # neuron_type have at each position and how many nodes there are before the neuron_type.
                        # That is, we need to find the indices for the neuron_type in the GID list found above.
                        totalNoOfEl = selection_dict['noOfNeuronTypesInLayer'][name]
                        numberOfPositions = len(gids) / totalNoOfEl

                        start_idx, end_idx = self.getIndicesOfNeuronType( neuron_type, models, numberOfPositions )
                        sorted_gids = sorted(gids)
                        collected_gids += sorted_gids[start_idx:end_idx]

        return collected_gids

    def getIndicesOfNeuronType(self, neuron_type, models, numberOfPositions):
        """
        Given a neuron type and number of selected neuron positions, finds the
        start and end indices in the list of selected neurons.

        :param neuron_type: type of neurons to find
        :param models: list of neuron models, on the form
            ``['L23pyr', 2, 'L23in', 1]`` or ``['Relay', 'Inter']``
        :param numberOfPositions: number of selected neuron positions
        """
        # models can for instance be of the form
        # ['L23pyr', 2, 'L23in', 1, 'L4pyr', 2, 'L4in', 1, 'L56pyr', 2, 'L56in', 1] or
        # ['Relay', 'Inter']

        # We count number of elements. So Relay will set counter to 1, while L23pyr will set counter to 2.
        counter = 0
        list_counter = 0
        start_index = 0
        end_index = 0
        for mod in models:
            # If mod is a string, we add the element, unless we have hit apon the neuron type, in which we need to
            # find the indices.
            if isinstance(mod, str):
                if mod == neuron_type:
                    start_index = counter * numberOfPositions

                    if list_counter + 1 == len(models) or isinstance(models[list_counter + 1], str):
                        end_index = ( counter + 1 ) * numberOfPositions
                    else:
                        end_index = ( counter + models[ list_counter + 1 ] ) * numberOfPositions
                    break
                # Adding element
                counter += 1
            else:
                # If mod is not a string, we have a number telling us how many elements of the last type
                # there is, so we add the number and subtract the element count from above.
                counter += mod - 1
            list_counter += 1

        return int(start_index), int(end_index)


    def printGIDs(self, selection):
        """
        Prints the selected GIDs to terminal.

        :param selection: dictionary containing specifications of the
            selected areas
        :returns: two-element touple with a list of GIDs and positions of the
            GIDs
        """
        gids = self.get_gids(selection)
        return (gids, tp.GetPosition(gids))

    def connect_all(self):
        """
        Connects both projections between layers and projections between layers
        and devices.
        """
        self.connect_internal_projections()
        self.connect_to_devices()

    def connect_internal_projections(self):
        """
        Makes connections from specifications of internal projections.
        """
        if self.internal_projections is None:
            return

        print("Connecting internal projections...")
        for proj in self.internal_projections:
            pre = proj[0]
            post = proj[1]
            conndict = self.floatify_dictionary(proj[2])
            tp.ConnectLayers(self.layers[pre], self.layers[post], conndict)
            print("Connected {} and {}".format(pre, post))

    def connect_to_devices(self):
        """
        Makes connections from selections specified by the user.
        """
        if self.device_projections is None:
            return

        print("Connecting to devices...")
        params_to_floatify = ['rate', 'amplitude', 'frequency']
        reverse_connection = ['voltmeter', 'multimeter', 'poisson_generator', 'ac_generator']

        for device_name in self.device_projections:
            model = self.device_projections[device_name]['specs']['model']
            params = self.device_projections[device_name]['specs']['params']
            # floatify params
            for key in params:
                if key in params_to_floatify:
                    params[key] = float(params[key])
            nest_device = nest.Create(model, 1, params)

            # If it is a recording device, add it to the list
            if 'record_to' in nest.GetStatus(nest_device)[0]:
                self.rec_devices.append([device_name, nest_device])

            connectees = self.device_projections[device_name]['connectees']
            for selection in connectees:
                nest_neurons = self.get_gids(selection)
                #synapse_model = selection['synModel']

                synapse_model = selection['synModel'] if not [device_name, nest_device] in self.rec_devices else 'static_synapse'
                if model == 'ac_generator':
                    synapse_model = 'static_synapse'

                if model in reverse_connection:
                    print("Connecting {} to {}".format(model, "neurons"))
                    nest.Connect(nest_device, nest_neurons, syn_spec=synapse_model)
                else:
                    print("Connecting {} to {}".format("neurons", model))
                    nest.Connect(nest_neurons, nest_device,
                                 syn_spec=synapse_model)

    def floatify_dictionary(self, dict_to_floatify):
        """
        Function that goes through a (possibly nested) dictionary and
        floatifies integers.

        :param dict_to_floatify: dictionary to go through
        :returns: dictionary where integers are floats
        """
        for d in dict_to_floatify:
            if isinstance(dict_to_floatify[d], dict):
                self.floatify_dictionary(dict_to_floatify[d])
            elif isinstance(dict_to_floatify[d], numbers.Number):
                    dict_to_floatify[d] = float(dict_to_floatify[d])
        return dict_to_floatify

    def get_connections(self):
        """
        Gets all connections from NEST.

        :returns: list of connections
        """
        return nest.GetConnections()

    def get_num_connections(self):
        """
        Gets the number of connections.

        :returns: number of connections
        """
        return nest.GetKernelStatus()['num_connections']

    def prepare_simulation(self):
        """
        Prepares NEST to run a simulation.
        """
        print("Preparing simulation")
        nest.Prepare()

    def run(self, t):
        """
        Runs a simulation for a specified time.

        :param t: time to simulate
        """
        # nest.SetKernelStatus({'print_time': True})

        nest.Run(t)

    def cleanup_simulation(self):
        """
        Make NEST cleanup after a finished simulation.
        """
        print("Cleaning up after simulation")
        nest.Cleanup()

    def get_device_results(self):
        """
        Gets results from devices.

        :returns: if there are new results from the devices, returns a
            dictionary with these, else returns `None`
        """

        results = {}
        # TODO: Set up on the fly
        recording_events = {'spike_det': {'senders': [], 'times': []},
                            'rec_dev': {'times': [], 'V_m': []}}

        time_array = []
        vm_array = []

        for device_name, device_gid in self.rec_devices:
            status = nest.GetStatus(device_gid)[0]
            if status['n_events'] > 0:
                events = {}
                device_events = status['events']

                # TODO numpy i json?
                if 'voltmeter' in device_name:
                    for e in range(status['n_events']):
                        events[str(device_events['senders'][e])] = [
                            device_events['times'][e],
                            round(device_events['V_m'][e])]
                else:
                    for e in range(status['n_events']):
                        events[str(device_events['senders'][e])] = [
                            device_events['times'][e]]
                results[device_name] = events

                # For plotting: (All should just be one dictionary eventually...)
                if 'spike_detector' in device_name:
                    recording_events['spike_det']['senders'] += (
                        [float(y) for y in device_events['senders']])
                    recording_events['spike_det']['times'] += (
                        [float(x) for x in device_events['times']])
                else:
                    vm_count = -1
                    for count, t in enumerate(device_events['times']):
                        if t not in time_array:
                            time_array.append(t)
                            vm_array.append([])
                            vm_count += 1
                        vm_array[vm_count].append(device_events['V_m'][count])
                    recording_events['rec_dev']['times'] += time_array
                    recording_events['rec_dev']['V_m'] += vm_array

                nest.SetStatus(device_gid, 'n_events', 0)  # reset the device

        if results:
            recording_events['time'] = nest.GetKernelStatus('time')
            return {"stream_results": results,
                    "plot_results": recording_events}
        else:
            return None
