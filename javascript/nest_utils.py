# -*- coding: utf-8 -*-
import nest
import nest.topology as tp


def make_nodes(networkSpecs):
    # TODO: sjekke om gjort fra før
    # TODo: gjør om til klasse
    nest.ResetKernel()
    global layers, syn_models, rec_devices
    layers = {}
    syn_models = {}
    rec_devices = []
    for layer in networkSpecs['layers']:
        neurons = layer['neurons']
        pos = [[float(neuron['x']), float(neuron['y'])]
               for neuron in neurons]
        model = layer['elements']
        nest_layer = tp.CreateLayer({'positions': pos,
                                     'elements': networkSpecs[
                                         'models'][model]})
        layers[layer['name']] = nest_layer
    return layers


def make_mask(lower_left, upper_right, mask_type, cntr):
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

    mask = tp.CreateMask(mask_type, spec)

    return mask


def make_synapse_models(syn_collection):
    for syn_name, model_name, syn_specs in syn_collection:
        nest.CopyModel(syn_name, model_name, syn_specs)


def get_gids(selection_dict):
    name = selection_dict['name']
    selection = selection_dict['selection']
    mask_type = selection_dict['maskShape']
    x_limit_start = -0.5
    y_limit_start = -0.5
    x_limit_end = 0.5
    y_limit_end = 0.5

    ll = [selection['ll']['x'], selection['ll']['y']]
    ur = [selection['ur']['x'], selection['ur']['y']]
    if ll[0] < x_limit_start:
        ll[0] = x_limit_start
    if ll[1] < y_limit_start:
        ll[1] = y_limit_start

    if ur[0] > x_limit_end:
        ur[0] = x_limit_end
    if ur[1] > y_limit_end:
        ur[1] = y_limit_end
    cntr = [0.0, 0.0]
    mask = make_mask(ll, ur, mask_type, cntr)
    print("Layers:")
    print(layers)
    gids = tp.SelectNodesByMask(layers[name],
                                cntr, mask)
    return gids


def printGIDs(selection):
    gids = get_gids(selection)
    return (gids, tp.GetPosition(gids))


def connect_internal_projections(internal_projections):
    """
    Makes connections from specifications of internal projections.
    """
    for proj in internal_projections:
        pre = proj[0]
        post = proj[1]
        conndict = proj[2]
        tp.ConnectLayers(layers[pre], layers[post], conndict)
        print("Success")


def connect_to_devices(device_projections):
    """
    Makes connections from selections specified by the user.
    """

    global rec_devices
    params_to_floatify = ['rate', 'amplitude', 'frequency']

    for device_name in device_projections:
        model = device_projections[device_name]['specs']['model']
        params = device_projections[device_name]['specs']['params']
        # floatify params
        for key in params:
            if key in params_to_floatify:
                params[key] = float(params[key])
        nest_device = nest.Create(model, 1, params)

        # If it is a recording device, add it to the list
        if 'record_to' in nest.GetStatus(nest_device)[0]:
            rec_devices.append([device_name, nest_device])

        for selection in device_projections[device_name]['connectees']:
            nest_neurons = get_gids(selection)
            synapse_model = selection['synModel']

            if (model == "voltmeter" or model == "multimeter" or model == "poisson_generator"):
                print("Connecting {} to {}".format(model, "neurons"))
                nest.Connect(nest_device, nest_neurons)
            else:
                print("Connecting {} to {}".format("neurons", model))
                nest.Connect(nest_neurons, nest_device,
                             syn_spec=synapse_model)
        #if model == "poisson_generator":
        # import pprint
        # print("############################# "+device_name+" #########################")
        # print(nest_device)
        # pprint.pprint(nest.GetConnections(nest_device))

    # print(nest.GetConnections())
    # print("Recording devices after connecting", rec_devices)


def get_connections():
    return nest.GetConnections()


def get_num_connections():
    return nest.GetKernelStatus()['num_connections']


def prepare_simulation():
    print("Preparing simulation")
    nest.Prepare()


def run(t, return_events=False):
    # nest.SetKernelStatus({'print_time': True})

    # TODO: this should be moved
    # nest.set_verbosity("M_ERROR")
    nest.sr("M_ERROR setverbosity")  # While set_verbosity function is broken.

    nest.Run(t)


def cleanup_simulation():
    print("Cleaning up after simulation")
    nest.Cleanup()


def get_device_results():

    results = {}
    #TODO: Set up on the fly
    recording_events = {'spike_det': {'senders': [], 'times': []}, 'rec_dev': {'times': [], 'V_m': []}}

    time_array = []
    vm_array = []

    for device_name, device_gid in rec_devices:
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
            recording_events['spike_det']['senders'] += [ float(y) for y in device_events['senders']]
            recording_events['spike_det']['times'] += [float(x) for x in device_events['times']]
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

        return {"stream_results": results, "plot_results": recording_events}
    else:
        return None
