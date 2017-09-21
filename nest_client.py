from __future__ import print_function
import __builtin__  # for Python 3: builtins as __builtin__
import json
import gevent
import numbers
import math
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm
import nest
import nest.topology as tp


# redefine print
def print(*args, **kwargs):
    __builtin__.print('[\033[1m\033[96mclient\033[0m] ', end='')
    return __builtin__.print(*args, **kwargs)


class observe_slot(gevent.Greenlet):

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
            gevent.sleep()  # Yield context to let other greenlets work.


class NESTClient(object):
    def __init__(self):
        nett.initialize('tcp://127.0.0.1:8000')

        self.networkSpecs = {}
        self.layers = {}
        self.rec_devices = []

        self.slot_out_complete = nett.slot_out_float_message('task_complete')
        self.slot_out_nconnections = (
            nett.slot_out_float_message('nconnections'))

        self.slot_in_reset = nett.slot_in_float_message()
        self.slot_in_network = nett.slot_in_string_message()
        self.slot_in_projections = nett.slot_in_string_message()
        self.slot_in_connect = nett.slot_in_float_message()
        self.slot_in_get_n_connections = nett.slot_in_float_message()
        self.slot_in_simulate = nett.slot_in_float_message()

        self.slot_in_reset.connect('tcp://127.0.0.1:2001', 'reset')
        self.slot_in_network.connect('tcp://127.0.0.1:2001', 'network')
        self.slot_in_projections.connect('tcp://127.0.0.1:2001', 'projections')
        self.slot_in_connect.connect('tcp://127.0.0.1:2001', 'connect')
        self.slot_in_get_n_connections.connect('tcp://127.0.0.1:2001',
                                               'get_nconnections')
        self.slot_in_simulate.connect('tcp://127.0.0.1:2001', 'simulate')

        observe_slot_reset = observe_slot(self.slot_in_reset,
                                          fm.float_message(),
                                          self.handle_reset)
        observe_slot_network = observe_slot(self.slot_in_network,
                                            sm.string_message(),
                                            self.handle_make_network_specs)
        observe_slot_projections = observe_slot(self.slot_in_projections,
                                                sm.string_message(),
                                                self.handle_recv_projections)
        observe_slot_connect = observe_slot(self.slot_in_connect,
                                            fm.float_message(),
                                            self.handle_connect)
        observe_slot_get_nconnections = observe_slot(
            self.slot_in_get_n_connections,
            fm.float_message(),
            self.handle_get_nconnections)
        observe_slot_simulate = observe_slot(self.slot_in_simulate,
                                             fm.float_message(),
                                             self.handle_simulate)
        print('Client starting to observe')
        observe_slot_reset.start()
        observe_slot_network.start()
        observe_slot_projections.start()
        observe_slot_connect.start()
        observe_slot_get_nconnections.start()
        observe_slot_simulate.start()
        self.send_complete_signal()  # let the server know the client is ready
        gevent.sleep()  # Yield context to let greenlets work.

    def handle_reset(self, msg):
        print("Reseting kernel")
        nest.ResetKernel()

    def send_complete_signal(self):
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_complete.send(msg.SerializeToString())

    def handle_make_network_specs(self, msg):
        print("Making network specs")

        self.networkSpecs = json.loads(msg.value)
        self.make_models()
        self.make_nodes()
        self.make_synapse_models()
        self.send_complete_signal()

    def make_models(self):
        print("MAKE_MODELS")

        # NOTE: We currently do not take paramaters from users into account,
        # like 'tau' etc.
        models = self.networkSpecs['models']
        for new_mod, old_mod in models.items():
            nest.CopyModel(old_mod, new_mod)

    def make_synapse_models(self):
        print("Making synapse models")

        synapses = self.networkSpecs['syn_models']
        for syn_name, model_name, syn_specs in synapses:
            nest.CopyModel(syn_name, model_name, syn_specs)

    def make_nodes(self):
        print("Making nodes...")

        # NOTE: We currently do not take paramaters from users into account,
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
                    #elem = [ networkSpecs['models'][mod] for mod in model]
                else:
                    elem = self.networkSpecs['models'][model]
                # TODO: Use models from make_models!

                extent = layer['extent']
                center = layer['center']
                if not self.networkSpecs['is3DLayer']:
                    extent = extent[:-1]
                    center = center[:-1]
                nest_layer = tp.CreateLayer(
                    {'positions': pos,
                     'extent': [float(ext) for ext in extent],  # JSON converts the double to int
                     'center': [float(cntr) for cntr in center],
                     'elements': elem})
                self.layers[layer['name']] = nest_layer

        print("layers: ", self.layers)

    def make_models(self):
        print("Making models...")

        # NOTE: We currently do not take paramaters from users into account,
        # like 'tau' etc.
        models = self.networkSpecs['models']
        for new_mod, old_mod in models.items():
            nest.CopyModel(old_mod, new_mod)

    def handle_simulate(self, msg):
        print("HANDLE SIMULATION")
        
        t = msg.value
        self.prepare_simulation()
        self.run(t)
        self.cleanup_simulation()

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

    def handle_recv_projections(self, msg):
        self.device_projections = json.loads(msg.value)
        # print(self.device_projections)

    def handle_connect(self, msg):
        self.connect_internal_projections()
        self.connect_to_devices()
        self.send_complete_signal()

    def connect_internal_projections(self):
        print("Connecting internal projections...")
        internal_projections = self.networkSpecs['projections']
        for proj in internal_projections:
            pre = proj[0]
            post = proj[1]
            conndict = self.floatify_dictionary(proj[2])
            tp.ConnectLayers(self.layers[pre], self.layers[post], conndict)
            print("Connected {} and {}".format(pre, post))

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

    def handle_get_nconnections(self, in_msg):
        msg = fm.float_message()
        msg.value = nest.GetKernelStatus()['num_connections']
        self.slot_out_nconnections.send(msg.SerializeToString())
        print('Sent Nconnections: {}'.format(msg.value))
        self.send_complete_signal()

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
        print(self.layers)
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


if __name__ == '__main__':
    client = NESTClient()
