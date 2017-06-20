import nest
import nest.topology as tp


def make_network(networkSpecs):
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

    if mask_type == 'Rectangle':
        mask_t = 'rectangular'
        spec = {'lower_left': [lower_left[0] - cntr[0],
                               lower_left[1] - cntr[1]],
                'upper_right': [upper_right[0] - cntr[0],
                                upper_right[1] - cntr[1]]}
    elif mask_type == 'Ellipse':
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


def connect_to_devices(device_projections):
    """
    Makes connections from selections specified by the user.
    """
    global rec_devices
    for device_name in device_projections:
        print(device_projections[device_name])
        model = device_projections[device_name]['specs']['model']
        if model == "poisson_generator":
            nest_device = nest.Create(model, 1, {'rate': 70000.0})
        else:
            nest_device = nest.Create(model)

        # If it is a recording device, add it to the list
        if 'record_to' in nest.GetStatus(nest_device)[0]:
            rec_devices.append([device_name, nest_device])

        for selection in device_projections[device_name]['connectees']:
            nest_neurons = get_gids(selection)
            synapse_model = selection['synModel']

            if model == "spike_detector":
                nest.Connect(nest_neurons, nest_device)
            else:
                nest.Connect(nest_device, nest_neurons,
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


def prepare_simulation():
    print("Preparing simulation")
    nest.Prepare()


def simulate(t):
    # nest.SetKernelStatus({'print_time': True})
    nest.set_verbosity("M_ERROR")  # TODO: this should be moved
    nest.Run(t)


def cleanup_simulation():
    print("Cleaning up after simulation")
    nest.Cleanup()


def get_device_results():
    #  print(rec_devices)
    #  import pprint
    got_results = False
    results = {}
    for device in rec_devices:
        device_name = device[0]
        device_gid = device[1]
        status = nest.GetStatus(device_gid)[0]
        #  pprint.pprint(status)
        if status['n_events'] > 0:
            got_results = True
            #  print("Status:")
            #  pprint.pprint(status)
            events = {}
            device_events = status['events']
            # for node in device_events['senders']:
            #    events[node] = []
            for e in range(status['n_events']):
                if 'voltmeter' in device_name:
                    events[device_events['senders'][e]] = [
                        device_events['times'][e], device_events['V_m'][e]]
                else:
                    events[device_events['senders'][e]] = [
                        device_events['times'][e]]
            results[device_name] = events
            nest.SetStatus(device_gid, 'n_events', 0)  # reset the device
    if got_results:
        return results
    else:
        return None
