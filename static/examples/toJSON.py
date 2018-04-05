import json
import numpy as np


def convert(specs, conn_specs, file_name, model_name=None):
    if model_name is None:
        model_name = file_name
    json_dict = {"layers": []}
    json_dict["modelName"] = model_name
    json_dict['syn_models'] = specs[2]
    json_dict['models'] = {s[1]: s[0] for s in specs[1]}
    layers = specs[0]
    is3DLayer = True

    for layer in layers:
        name = layer[0]
        skip_layer = ("meter" in name.lower() or "detector" in name.lower() or
                      "generator" in name.lower())
        if skip_layer:
            continue

        layer_dict = {"neurons": []}
        layer_dict['elements'] = layer[1]['elements']
        layer_dict['name'] = name
        if 'neuronType' in layer[1]:
            layer_dict['neuronType'] = layer[1]['neuronType']
        else:
            layer_dict['neuronType'] = ""
        if 'extent' in layer[1]:
            ext = layer[1]['extent']
            # Need to make the conversion work for both 2D and 3D. We make 2D
            # layers into 3D, and set z-coordinates to zero.
            if len(ext) == 2:
                ext += [1.]
        else:
            ext = [1., 1., 1.]  # extent is one unless otherwise specified
        layer_dict['extent'] = ext
        if 'center' in layer[1]:
            cntr = layer[1]['center']
            # Need too make the conversion work for both 2D and 3D.
            if len(cntr) == 2:
                cntr += [1.]
        else:
            cntr = [0., 0., 0.]  # Center in origo unless otherwise specified
        layer_dict['center'] = cntr

        if 'columns' in layer[1]:
            # We can either get positions through rows and columns, or
            # through positions vector
            cols = layer[1]['columns']
            rows = layer[1]['rows']

            dx = ext[0] / float(cols)
            dy = ext[1] / float(rows)
            x_start = - (ext[0] / 2.0 - dx / 2.0) + cntr[0]
            x_end = ext[0] / 2.0 - dx / 2.0 + cntr[0]
            y_start = - (ext[1] / 2.0 - dy / 2.0) + cntr[1]
            y_end = ext[1] / 2.0 - dy / 2.0 + cntr[1]

            xpos_single = np.linspace(x_start, x_end, cols, endpoint=True)
            # x-positions for all nodes, to be used in scatterplot
            xpos = [x for x in xpos_single for i in range(cols)]

            # GIDs are numbered upwards -> down, while the y-axis has its
            # positive axis upwards, and its negative downwards
            ypos_single = np.linspace(y_end, y_start, rows, endpoint=True)
            ypos = [x for i in range(rows) for x in ypos_single]

            # If we are given rowns and columns, we have a 2D layer, and we set
            # z-coordinates to zero.
            zpos = [0] * len(xpos)
            is3DLayer = False
        else:
            # Positions through positions vector
            xpos = [x[0] for x in layer[1]['positions']]
            ypos = [y[1] for y in layer[1]['positions']]
            # Check to see if we have a 3D layer.
            if (len(layer[1]['positions'][0]) == 3):
                zpos = [z[2] for z in layer[1]['positions']]
            else:
                zpos = [0] * len(xpos)
                is3DLayer = False

        for i in range(len(xpos)):
            layer_dict["neurons"].append({"x": xpos[i],
                                          "y": ypos[i],
                                          "z": zpos[i]})
        json_dict["layers"].append(layer_dict)

    json_dict["is3DLayer"] = is3DLayer
    json_dict["projections"] = conn_specs
    # print("##############################")
    # pprint.pprint(json_dict)
    with open(file_name + '.json', 'w') as fp:
        json.dump(json_dict, fp)
