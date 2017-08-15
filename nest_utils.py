# -*- coding: utf-8 -*-
import math
import nest
import nest.topology as tp
import numbers


class NESTInterface(object):
    """
    Class for interacting with NEST.
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

        self.reset_kernel()
        self.make_models()
        self.make_nodes()
        if synapses:
            self.make_synapse_models()

        # nest.set_verbosity("M_ERROR")
        nest.sr("M_ERROR setverbosity")  # While set_verbosity function is broken.

    def reset_kernel(self):
        nest.ResetKernel()

    def make_nodes(self):
        # NOTE: We currently do not take paramaters from users into account, like 'tau' etc.
        if nest.GetKernelStatus()['network_size'] == 1:

            for layer in self.networkSpecs['layers']:
                neurons = layer['neurons']
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
                    #elem = [ self.networkSpecs['models'][mod] for mod in model]
                else:
                    elem = self.networkSpecs['models'][model]
                # TODO: Use models from make_models!

                nest_layer = tp.CreateLayer({'positions': pos,
                                             'extent': [float(ext) for ext in layer['extent']],  # JSON converts the double to int
                                             'center': [float(cntr) for cntr in layer['center']],
                                             'elements': elem})
                self.layers[layer['name']] = nest_layer
            return self.layers

    def make_models(self):
        # NOTE: We currently do not take paramaters from users into account, like 'tau' etc.
        models = self.networkSpecs['models']
        for new_mod, old_mod in models.items():
            nest.CopyModel(old_mod, new_mod)

    def make_mask(self, lower_left, upper_right, mask_type, angle, cntr):
        """
        Makes a mask from the specifications.

        :param lower_left: Coordinates for lower left of the selection.
        :param upper_right: Coordinates for upper right of the selection.
        :param mask_type: Shape of the mask. Either ``rectangle`` or
                          ``ellipse``.
        :param cntr: Coordinates for the center of the layer.
        :returns: A NEST ``Mask`` object.
        """

        if mask_type == 'rectangular':
            spec = {'lower_left': [lower_left[0] - cntr[0],
                                   lower_left[1] - cntr[1]],
                    'upper_right': [upper_right[0] - cntr[0],
                                    upper_right[1] - cntr[1]]}
        elif mask_type == 'elliptical':
            # Calculate center of ellipse
            xpos = (upper_right[0] + lower_left[0]) / 2.0
            ypos = (upper_right[1] + lower_left[1]) / 2.0
            # Find major and minor axis
            x_side = upper_right[0] - lower_left[0]
            y_side = upper_right[1] - lower_left[1]
            if x_side >= y_side:
            #    angle = 0.0
                major = x_side
                minor = y_side
            else:
            #    angle = 90.
                major = y_side
                minor = x_side
            spec = {'major_axis': major, 'minor_axis': minor,
                    'anchor': [xpos - cntr[0], ypos - cntr[1]],
                    'azimuth_angle': angle}
        else:
            raise ValueError('Invalid mask type: %s' % mask_type)

        mask = tp.CreateMask(mask_type, spec)

        return mask

    def make_synapse_models(self):
        for syn_name, model_name, syn_specs in self.synapses:
            nest.CopyModel(syn_name, model_name, syn_specs)

    def get_gids(self, selection_dict):
        # TODO: We do not take neuron type into account yet! We can choose it in app, but it does not do anything!
        name = selection_dict['name']
        selection = selection_dict['selection']
        mask_type = selection_dict['maskShape']
        angle = float(selection_dict['angle']) * 180 / math.pi

        ll = [selection['ll']['x'], selection['ll']['y']]
        ur = [selection['ur']['x'], selection['ur']['y']]

        cntr = [0.0, 0.0]
        mask = self.make_mask(ll, ur, mask_type, angle, cntr)
        gids = tp.SelectNodesByMask(self.layers[name],
                                    cntr, mask)
        return gids

    def printGIDs(self, selection):
        gids = self.get_gids(selection)
        return (gids, tp.GetPosition(gids))

    def connect_all(self):
        self.connect_internal_projections()
        self.connect_to_devices()

    def connect_internal_projections(self):
        """
        Makes connections from specifications of internal projections.
        """
        if self.internal_projections is None:
            return

        for proj in self.internal_projections:
            pre = proj[0]
            post = proj[1]
            conndict = self.floatify_dictionary(proj[2])
            tp.ConnectLayers(self.layers[pre], self.layers[post], conndict)
            print("Success")

    def connect_to_devices(self):
        """
        Makes connections from selections specified by the user.
        """
        if self.device_projections is None:
            return

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
        Helper function to go through dictionary with dictionaries and floatify integers.
        """
        for d in dict_to_floatify:
            if isinstance(dict_to_floatify[d], dict):
                self.floatify_dictionary(dict_to_floatify[d])
            elif isinstance(dict_to_floatify[d], numbers.Number):
                    dict_to_floatify[d] = float(dict_to_floatify[d])
        return dict_to_floatify

    def get_connections(self):
        return nest.GetConnections()

    def get_num_connections(self):
        return nest.GetKernelStatus()['num_connections']

    def prepare_simulation(self):
        print("Preparing simulation")
        nest.Prepare()

    def run(self, t, return_events=False):
        # nest.SetKernelStatus({'print_time': True})

        nest.Run(t)

    def cleanup_simulation(self):
        print("Cleaning up after simulation")
        nest.Cleanup()

    def get_device_results(self):

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
