import nest
import nest.topology as tp


def make_network(networkSpecs):
    global layers, syn_models
    layers = {}
    syn_models = {}
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


def make_synapse_models(syn_collection):
    for syn_name, model_name, syn_specs in syn_collection:
        nest.CopyModel(syn_name, model_name, syn_specs)


def get_gids(selection_dict):
    name = selection_dict['name']
    selection = selection_dict['selection']
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
    mask = make_mask(ll, ur, 'rectangle', cntr)
    gids = tp.SelectNodesByMask(layers[name],
                                cntr, mask)
    return gids


def connect(selection_array):
    """
    Makes connections from selections specified by the user.
    """

    for projection in ['projection %i' % i for i in range(1, 6)]:
        con_dict = {
            'Source': [],
            'Target': []
        }
        for selection in selection_array:
            # skip if the projection is wrong
            if selection['projection'] != projection:
                continue
            # we don't think about neuron types yet
            con_dict[selection['endpoint']] += get_gids(selection)
        print(con_dict)
        nest.Connect(con_dict['Source'],
                     con_dict['Target'],
                     syn_spec=selection['synModel'])
    print(nest.GetConnections())
