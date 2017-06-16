import json
import numpy as np
import pprint


def convert(specs, conn_specs):
    json_dict = {"layers": []}
    json_dict['syn_models'] = specs[2]
    json_dict['models'] = {s[1]: s[0] for s in specs[1]}
    layers = specs[0]

    for layer in layers:
        layer_dict = {"neurons": []}
        print layer
        layer_dict['elements'] = layer[1]['elements']
        name = layer[0]
        layer_dict['name'] = name
        try:
            ext = layer[1]['extent']
        except KeyError:
            ext = [1., 1.]  # extent is one unless otherwise specified
        try:
            cntr = layer[1]['center']
        except KeyError:
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
        except KeyError:
            # Positions through positions vector
            xpos = [x[0] for x in layer[1]['positions']]
            ypos = [y[1] for y in layer[1]['positions']]

        for i in range(len(xpos)):
            layer_dict["neurons"].append({"x": xpos[i], "y": ypos[i]})
        json_dict["layers"].append(layer_dict)

        # print(json.dumps(json_dict))
    json_dict["projections"] = conn_specs
    print("##############################")
    pprint.pprint(json_dict)
    print("##############################")
    with open('brunel_converted.json', 'w') as fp:
        json.dump(json_dict, fp)
