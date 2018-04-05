from __future__ import print_function
import __builtin__  # for Python 3: builtins as __builtin__
import sys
import json
import gevent
import numbers
import math
import numpy as np
import random
import traceback as tb
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm
import nest
import nest.topology as tp


# redefine print
def print(*args, **kwargs):
    """
    A cosmetic change to the print function to show more clearly what is
    actually printing when we are running the NESTClient in the same terminal.
    """
    __builtin__.print('[\033[1m\033[96mclient\033[0m] ', end='')
    return __builtin__.print(*args, **kwargs)


class observe_slot(gevent.Greenlet):
    """
    A listener for messages from the server. Each listener spawns its own
    Greenlet.

    :param slot: The nett type slot to receive from
    :param message_type: The nett type data-type to receive
    :param client: The instance of NESTClient that created the listener. Used
                   to call callback functions.
    """

    def __init__(self, slot, message_type, client):
        super(observe_slot, self).__init__()
        self.slot = slot
        self.msg = message_type
        self.last_message = None
        self.state = False
        self.client = client
        # print('Started {}'.format(callback))

    def get_last_message(self):
        """
        Gets the last message received.

        :returns: The last message received
        """
        return self.last_message

    def set_state(self, state):
        """
        Sets the state.

        :param state: State to set
        """
        self.state = state

    def handle_message(self):
        """
        Handles the message received and calls the appropriate callback
        function in the client.
        """
        try:
            msg_type = self.msg.value.split()[0]
            msg_data = " ".join(self.msg.value.split()[1:])
            if msg_type == 'reset':
                self.client.handle_reset()
            elif msg_type == 'projections':
                self.client.handle_recv_projections(msg_data)
            elif msg_type == 'make_network':
                self.client.handle_make_network_specs(msg_data)
            elif msg_type == 'get_gids':
                self.client.handle_get_gids(msg_data)
            elif msg_type == 'connect':
                self.client.handle_connect()
            elif msg_type == 'get_nconnections':
                self.client.handle_get_nconnections()
            elif msg_type == 'simulate':
                self.client.handle_simulate(msg_data)
            elif msg_type == 'ping':
                self.client.handle_ping()
        except Exception as exception:
            print('An exception was raised:', exception)
            self.client.send_status_message(
                "{} {}: {}".format(self.client.user_id,
                                   type(exception).__name__,
                                   exception.args[0]))
            tb.print_exc()
            self.client.send_complete_signal()

    def run(self):
        """
        Runs the Greenlet.
        """
        while True:
            # TODO: Either find a way to use Greenlets with nett without having
            # slot.receive() blocking them, or remove the implementation with
            # Greenlets as it isn't needed in the current implementation.
            self.msg.ParseFromString(self.slot.receive())
            if self.msg.value is not None:
                self.last_message = self.msg.value
                # self.callback(self.msg)
                self.handle_message()
            self.state = not self.state
            self.last_message = self.msg
            # gevent.sleep()  # Yield context to let other greenlets work.


class NESTClient(object):
    """
    For running NEST. Controlled by NESTInterface.
    """

    def __init__(self, user_id, silent=False):
        nest.set_verbosity("M_ERROR")
        self.user_id = user_id
        self.silent = silent

        random.seed(int(self.user_id))
        nett.initialize('tcp://127.0.0.1:{}'.format(
            8000 + random.randint(1, 1000)))

        self.networkSpecs = {}
        self.layers = {}
        self.device_projections = None
        self.reset_saved_network()

        self.print('Setting up slot messages..')
        self.slot_out_complete = nett.slot_out_float_message(
            'task_complete_{}'.format(self.user_id))
        self.slot_out_nconnections = (
            nett.slot_out_float_message(
                'nconnections_{}'.format(self.user_id)))
        self.slot_out_device_results = (
            nett.slot_out_string_message(
                'device_results_{}'.format(self.user_id)))
        self.slot_out_status_message = (
            nett.slot_out_string_message(
                'status_message_{}'.format(self.user_id)))

        self.slot_in_data = nett.slot_in_string_message()
        self.print('Connecting to data input stream..')
        self.slot_in_data.connect(
            'tcp://127.0.0.1:2001', 'data_{}'.format(self.user_id))
        self.print('Initializing observe slot..')
        observe_slot_data = observe_slot(self.slot_in_data,
                                         sm.string_message(),
                                         self)
        self.print('Starting observe slot..')
        observe_slot_data.start()

        try:
            nest.Install('lfpmodule')
        except nest.NESTError:
            self.print('LFP module not found.')

        self.send_complete_signal()  # let the server know the client is ready
        gevent.sleep()  # Yield context to let greenlets work.

    def print(self, *args, **kwargs):
        """
        Wrapper around the print function to handle silent mode.
        """
        if not self.silent:
            print(*args, **kwargs)

    def handle_ping(self):
        """
        Sends a signal to all slots in the server.
        """
        for slot, msg in [[self.slot_out_nconnections, fm.float_message()],
                          [self.slot_out_device_results, sm.string_message()],
                          [self.slot_out_status_message, sm.string_message()]]:
            slot.send(msg.SerializeToString())
        self.send_complete_signal()

    def handle_reset(self):
        """
        Resets the NEST kernel.
        """
        self.print("Resetting kernel")
        nest.ResetKernel()
        self.send_complete_signal()

    def send_complete_signal(self):
        """
        Sends a signal to NESTInterface that the current task is complete.
        """
        self.print('Sending complete signal')
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_complete.send(msg.SerializeToString())

    def handle_make_network_specs(self, networkSpecs):
        """
        Loads the network specifications from JSON format and makes models,
        nodes, and synapse models.

        :param networkSpecs: Network specifications
        """
        self.print("Making network specs")

        self.networkSpecs = json.loads(networkSpecs)

        self.make_models()
        self.make_nodes()
        self.make_synapse_models()
        self.send_complete_signal()

    def reset_saved_network(self):
        """
        Empty device array, reset other saved variables.
        """
        self.rec_devices = []
        self.prepared_simulation = False
        self.last_results = None

    def make_models(self):
        """
        Makes neuron models, based on models from network specifications.
        """
        self.print("Making models...")

        # NOTE: We currently do not take parameters from users into account,
        # like 'tau' etc.
        models = self.networkSpecs['models']
        self.print(models)
        for new_mod, old_mod in models.items():
            nest.CopyModel(old_mod, new_mod)

    def make_synapse_models(self):
        """
        Makes synapse models, based on models from network specifications.
        """
        self.print("Making synapse models")

        synapses = self.networkSpecs['syn_models']
        for syn_name, model_name, syn_specs in synapses:
            nest.CopyModel(syn_name, model_name, syn_specs)

    def make_nodes(self):
        """
        Makes layers and nodes, based on network specifications.
        """
        self.print("Making nodes...")

        # NOTE: We currently do not take parameters from users into account,
        # like 'tau' etc.
        if nest.GetKernelStatus()['network_size'] == 1:

            for layer in self.networkSpecs['layers']:
                neurons = layer['neurons']
                if self.networkSpecs['is3DLayer']:
                    pos = [[float(neuron['x']),
                            float(neuron['y']),
                            float(neuron['z'])]
                           for neuron in neurons]
                else:
                    pos = [[float(neuron['x']), float(neuron['y'])]
                           for neuron in neurons]
                model = layer['elements']
                if isinstance(model, list):
                    elem = []
                    for mod in model:
                        if isinstance(mod, str):
                            elem.append(self.networkSpecs['models'][mod])
                        else:
                            elem.append(mod)
                    # elem = [ networkSpecs['models'][mod] for mod in model]
                else:
                    elem = self.networkSpecs['models'][model]
                # TODO: Use models from make_models!

                extent = layer['extent']
                center = layer['center']
                if not self.networkSpecs['is3DLayer']:
                    extent = extent[:-1]
                    center = center[:-1]
                # Going via JSON converts double values to integers, so they
                # have to be converted back when passing values to NEST.
                nest_layer = tp.CreateLayer(
                    {'positions': pos,
                     'extent': [float(ext) for ext in extent],
                     'center': [float(cntr) for cntr in center],
                     'elements': elem})
                self.layers[layer['name']] = nest_layer

    def handle_simulate(self, t):
        """
        Runs a simulation for a specified time.

        :param t: Time to simulate
        """
        if not self.prepared_simulation:
            self.print("prepare simulation")
            self.prepare_simulation()
            self.prepared_simulation = True

        if t == '-1':
            self.print("clean up simulation")
            self.cleanup_simulation()
            self.prepared_simulation = False
        else:
            self.run(t)
            self.send_device_results()

    def prepare_simulation(self):
        """
        Prepares NEST to run a simulation.
        """
        self.print("Preparing simulation")
        nest.Prepare()

    def run(self, t):
        """
        Runs a simulation for a specified time.

        :param t: time to simulate
        """
        nest.SetKernelStatus({'print_time': not self.silent})

        nest.Run(t)

    def cleanup_simulation(self):
        """
        Make NEST clean up after a finished simulation.
        """
        self.print("Cleaning up after simulation")
        nest.Cleanup()

    def send_device_results(self):
        """
        Gets results from the devices and sends them to NESTInterface.
        """
        msg = sm.string_message()
        msg.value = json.dumps(self.get_device_results())
        self.slot_out_device_results.send(msg.SerializeToString())

    def send_status_message(self, message):
        """
        Sends a message with the status to NESTInterface.

        :param message: Message to send
        """
        msg = sm.string_message()
        msg.value = str(message)
        self.slot_out_status_message.send(msg.SerializeToString())

    def handle_recv_projections(self, projections):
        """
        Handles receiving projections.

        :param projections: Received projections
        """
        self.device_projections = json.loads(projections)
        self.send_complete_signal()

    def handle_connect(self):
        """
        Handles connecting all the network.
        """
        self.print('Received connect signal')

        # First need to reset kernel, make nodes, models and synapses
        nest.ResetKernel()
        self.make_models()
        self.make_nodes()
        self.make_synapse_models()

        # Then need to connect
        self.connect_internal_projections()
        self.connect_to_devices()
        self.send_complete_signal()

    def connect_internal_projections(self):
        """
        Connects all internal projections, as specified in network
        specifications.
        """
        self.print("Connecting internal projections...")
        internal_projections = self.networkSpecs['projections']
        for proj in internal_projections:
            pre = proj[0]
            post = proj[1]
            conndict = self.floatify_dictionary(proj[2])
            tp.ConnectLayers(self.layers[pre], self.layers[post], conndict)
            self.print("Connected {} and {}".format(pre, post))

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

    def connect_to_devices(self):
        """
        Makes connections from selections specified by the user.
        """
        self.reset_saved_network()
        if self.device_projections is None:
            return

        self.print("Connecting to devices...")
        params_to_floatify = ['rate', 'amplitude', 'frequency']
        reverse_connection = ['voltmeter', 'poisson_generator', 'ac_generator']

        for device_name in self.device_projections:
            model = self.device_projections[device_name]['specs']['model']
            params = self.device_projections[device_name]['specs']['params']

            if model == 'LFP':
                self.connect_to_lfp()
                self.connect_to_poisson()
                continue

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

                synapse_model = (selection['synModel']
                                 if not [device_name, nest_device]
                                 in self.rec_devices else 'static_synapse')
                if model == 'ac_generator':
                    synapse_model = 'static_synapse'
                elif model in reverse_connection:
                    self.print("Connecting {} to {}".format(model, "neurons"))
                    nest.Connect(nest_device, nest_neurons,
                                 syn_spec=synapse_model)
                else:
                    self.print("Connecting {} to {}".format("neurons", model))
                    nest.Connect(nest_neurons, nest_device,
                                 syn_spec=synapse_model)

    def connect_to_poisson(self):
        net_dict = {'bg_rate': 8.,
                    'poisson_delay': 1.5,
                    'K_ext': np.array([1600, 1500, 2100, 1900, 2000, 1900, 2900, 2100]),
                    'K_scaling': 0.1, 'C_m': 250.0, 'tau_m': 10.0, 'tau_syn_ex': 0.5, 'PSP_e': 0.15}
        K_ext = net_dict['K_ext'] * net_dict['K_scaling']

        C_m = net_dict['C_m']
        tau_m = net_dict['tau_m']
        tau_syn_ex = net_dict['tau_syn_ex']
        PSP_val = net_dict['PSP_e']

        PSC_e_over_PSP_e = (((C_m) ** (-1) * tau_m * tau_syn_ex / (
            tau_syn_ex - tau_m) * ((tau_m / tau_syn_ex) ** (
                - tau_m / (tau_m - tau_syn_ex)) - (tau_m / tau_syn_ex) ** (
                    - tau_syn_ex / (tau_m - tau_syn_ex)))) ** (-1))
        PSC_e = (PSC_e_over_PSP_e * PSP_val)

        w_ext = PSC_e

        rate_ext = net_dict['bg_rate'] * K_ext
        poisson = []
        for i in range(len(self.layers)):
            poiss = nest.Create('poisson_generator')
            nest.SetStatus(poiss, {'rate': rate_ext[i]})
            poisson.append(poiss)

        for i, target_pop in enumerate(self.layers):
            conn_dict_poisson = {'rule': 'all_to_all'}
            syn_dict_poisson = {
                'model': 'static_synapse',
                'weight': w_ext,
                'delay': net_dict['poisson_delay']
                }
            nest.Connect(
                poisson[i], nest.GetNodes(self.layers[target_pop])[0],
                conn_spec=conn_dict_poisson,
                syn_spec=syn_dict_poisson
                )

    def connect_to_lfp(self):
        print('Setting up LFP model...')
        # Load kernels
        tau_rise_array = np.zeros([16, 64])
        tau_decay_array = np.zeros([16, 64])
        normalizer_array = np.zeros([16, 64])
        tau_rise2_array = np.zeros([16, 64])
        tau_decay2_array = np.zeros([16, 64])
        normalizer2_array = np.zeros([16, 64])
        borders = []

        # Dictionaries don't save order, so we need to set a fixed order
        # TODO: Alternatively use collections.OrderedDict.
        layer_names = ['L23E', 'L23I', 'L4E', 'L4I',
                       'L5E', 'L5I', 'L6E', 'L6I']
        for name in layer_names:
            layer = self.layers[name]
            nodes = nest.GetNodes(layer)[0]
            borders.append(min(nodes))
            borders.append(max(nodes))

        with open('static/examples/LFP/' +
                  'double_fitted_values.json', 'r') as variables_file:
            fitted_variables = json.load(variables_file)
        for ch in range(16):
            index = 0
            for from_pop in layer_names:
                for to_pop in layer_names:
                    tau_rise_array[ch][index] = (
                        1. / fitted_variables[str(ch)][from_pop][to_pop]['a'])
                    tau_decay_array[ch][index] = (
                        1. / fitted_variables[str(ch)][from_pop][to_pop]['b'])
                    normalizer_array[ch][index] = (
                        fitted_variables[str(ch)][from_pop][to_pop]['deta0'])

                    tau_rise2_array[ch][index] = (
                        1. / fitted_variables[str(ch)][from_pop][to_pop]['a2'])
                    tau_decay2_array[ch][index] = (
                        1. / fitted_variables[str(ch)][from_pop][to_pop]['b2'])
                    normalizer2_array[ch][index] = (
                        fitted_variables[str(ch)][from_pop][to_pop]['deta02'])
                    index += 1

        # Create LFP detectors
        lfp_detectors = [nest.Create('lfp_detector', 1,
                                     {'tau_rise': tau_rise_array[ch],
                                      'tau_decay': tau_decay_array[ch],
                                      'normalizer': normalizer_array[ch],
                                      'tau_rise2': tau_rise2_array[ch],
                                      'tau_decay2': tau_decay2_array[ch],
                                      'normalizer2': normalizer2_array[ch],
                                      'borders': borders})
                         for ch in range(16)]
        multimeters = nest.Create('multimeter', 16,
                                  {'record_from': ['lfp'],
                                   'interval': 1.0})  # 0.1
        self.rec_devices.append(['lfp_multimeters', multimeters])

        print('Connecting to LFP model...')
        connectees = self.device_projections['LFP']['connectees']
        selected_neurons = [self.get_gids(s) for s in connectees]
        for ch, lfp_det in enumerate(lfp_detectors):
            nest.Connect((multimeters[ch],), lfp_det)
            for neurons in selected_neurons:
                nest.Connect(neurons, lfp_det, 'all_to_all',
                             {'model': 'static_synapse', 'receptor_type': 1})

    def handle_get_nconnections(self):
        """
        Handles get number of connections. Gets number of connections from
        NEST, then sends them to NESTInterface.
        """
        msg = fm.float_message()
        msg.value = nest.GetKernelStatus()['num_connections']
        self.slot_out_nconnections.send(msg.SerializeToString())
        self.print('Sent Nconnections: {}'.format(msg.value))
        self.send_complete_signal()

    def make_mask(self, lower_left, upper_right, mask_type, azimuth_angle,
                  polar_angle, cntr):
        """
        Makes a mask from the specifications.

        :param lower_left: Coordinates for lower left of the selection.
        :param upper_right: Coordinates for upper right of the selection.
        :param mask_type: Shape of the mask. Either ``rectangle`` or
                          ``ellipse``.
        :param azimuth_angle: Rotation angle in degrees from x-axis.
        :param polar_angle: Rotation angle in degrees from z-axis.
        :param cntr: Coordinates for the centre of the layer.
        :returns: A NEST ``Mask`` object.
        """

        if mask_type == 'rectangular':
            spec = {'lower_left': [lower_left[0] - cntr[0],
                                   lower_left[1] - cntr[1]],
                    'upper_right': [upper_right[0] - cntr[0],
                                    upper_right[1] - cntr[1]],
                    'azimuth_angle': azimuth_angle
                    }
        elif mask_type == 'elliptical':
            # Calculate centre of ellipse
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
                    'azimuth_angle': azimuth_angle,
                    'polar_angle': polar_angle
                    }
        elif mask_type == 'ellipsoidal':
            # Calculate centre of ellipse
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

    def handle_get_gids(self, selection):
        self.print("Get gids")

        selection_dict = json.loads(selection)
        gids = self.get_gids(selection_dict)

        self.print("GID positions:")
        self.print(tp.GetPosition(gids))
        self.print(gids)
        self.send_complete_signal()
        return gids

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

        # TODO: There must be a better way to do this. Also, centre in origo is
        # not always correct. Also, does SelectNodesByMask really need to be
        # sent cntr? Could it work if we said that it start in origo at c++
        # level? What happens if layer is outside origo?
        if (ll[2] == ur[2]):
            cntr = [0.0, 0.0]
        else:
            cntr = [0.0, 0.0, 0.0]
        mask = self.make_mask(ll, ur, mask_type,
                              azimuth_angle, polar_angle, cntr)

        collected_gids = []
        # TODO: Think we might be able to use only one of these for-loops, the
        # last one. And then check if layer['name'] is in layer_names.
        # In case of a 3D layer, we have to go through all the layer names in
        # the selection_dict, because we only have one dict for the selection,
        # but the area might encompass several layers.
        for name in layer_names:
            gids = tp.SelectNodesByMask(self.layers[name],
                                        cntr, mask)

            # If we have chosen neuron_type All, we return all the GIDs.
            if neuron_type == "All":
                collected_gids += gids
                continue

            # If we have chosen a specific neuron_type, we have to find the
            # correct GIDs. To do this, we have to go through all the layers
            # and compare to the type we have chosen.
            for layer in self.networkSpecs['layers']:
                if name == layer['name']:
                    # All the elements in the selected layer
                    models = layer['elements']

                    # If neuron_type is in models, the layer contains the
                    # chosen neuron_type, and we must find the correct GIDs.
                    if neuron_type in models:
                        # If models is not a list, the layer contains only one
                        # element type, we have chosen this type and the found
                        # GIDs are the GIDs of the chosen element type.
                        if not isinstance(models, list):
                            collected_gids += gids
                            continue

                        # If models is a list, we need to find how many
                        # positions we have chosen in the mask, how many nodes
                        # the neuron_type have at each position and how many
                        # nodes there are before the neuron_type. That is, we
                        # need to find the indices for the neuron_type in the
                        # GID list found above.
                        totalNoOfEl = (
                            selection_dict['noOfNeuronTypesInLayer'][name])
                        numberOfPositions = len(gids) / totalNoOfEl

                        start_idx, end_idx = (
                            self.getIndicesOfNeuronType(neuron_type, models,
                                                        numberOfPositions))
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
        # ['L23pyr', 2, 'L23in', 1, 'L4pyr', 2,
        #  'L4in', 1, 'L56pyr', 2, 'L56in', 1]
        # or
        # ['Relay', 'Inter']

        # We count number of elements. So Relay will set counter to 1, while
        # L23pyr will set counter to 2.
        counter = 0
        list_counter = 0
        start_index = 0
        end_index = 0
        for mod in models:
            # If mod is a string, we add the element, unless mod is
            # the neuron type, in which we need to find the indices.
            if isinstance(mod, str):
                if mod == neuron_type:
                    start_index = counter * numberOfPositions

                    model_is_string = isinstance(models[list_counter + 1], str)
                    if (list_counter + 1 == len(models) or model_is_string):
                        end_index = (counter + 1) * numberOfPositions
                    else:
                        end_index = ((counter + models[list_counter + 1]) *
                                     numberOfPositions)
                    break
                # Adding element
                counter += 1
            else:
                # If mod is not a string, we have a number telling us how many
                # elements of the last type there is, so we add the number and
                # subtract the element count from above.
                counter += mod - 1
            list_counter += 1

        return int(start_index), int(end_index)

    def get_device_results(self):
        """
        Gets results from devices.

        :returns: if there are new results from the devices, returns a
            dictionary with these, else returns `None`
        """

        results = {}
        # TODO: Set up on the fly
        recording_events = {'spike_det': {'senders': [], 'times': []},
                            'rec_dev': {'times': [], 'V_m': []},
                            'lfp_det': {str(i): {'lfp': []}
                                        for i in range(16)}}
        recording_events['lfp_det']['times'] = []

        time_array = []
        vm_array = []

        for device_name, device_gid in self.rec_devices:
            status = nest.GetStatus(device_gid)[0]

            if status['n_events'] > 0:
                events = {}
                device_events = status['events']

                # TODO numpy in json?
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

                # For plotting:
                # (All should just be one dictionary eventually...)
                if 'spike_detector' in device_name:
                    recording_events['spike_det']['senders'] += (
                        [float(y) for y in device_events['senders']])
                    recording_events['spike_det']['times'] += (
                        [float(x) for x in device_events['times']])
                elif 'voltmeter' in device_name:
                    vm_count = -1
                    for count, t in enumerate(device_events['times']):
                        if t not in time_array:
                            time_array.append(t)
                            vm_array.append([])
                            vm_count += 1
                        vm_array[vm_count].append(device_events['V_m'][count])
                    recording_events['rec_dev']['times'] += time_array
                    recording_events['rec_dev']['V_m'] += vm_array
                elif 'lfp_multimeters' in device_name:
                    for ch in range(len(device_gid)):
                        # device_gid is a list of GIDs
                        mm_status = nest.GetStatus((device_gid[ch],))
                        events = mm_status[0]['events']
                        recording_events['lfp_det'][str(ch)]['lfp'] += [
                            float(l) for l in events['lfp']]
                    recording_events['lfp_det']['times'] += [
                        float(t) for t in events['times']]

                nest.SetStatus(device_gid, 'n_events', 0)  # reset the device

        self.last_results = results
        if results:
            recording_events['time'] = nest.GetKernelStatus('time')
            return {"stream_results": results,
                    "plot_results": recording_events}
        else:
            return None


if __name__ == '__main__':
    user_id = sys.argv[1]
    # silent = sys.argv[1] == '-s' if len(sys.argv) > 1 else False
    client = NESTClient(user_id, silent=False)
