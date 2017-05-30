from __future__ import print_function
import pprint
import flask
import nest
import nest.topology as tp
import nest_utils as nu

app = flask.Flask(__name__)


@app.route('/NESTConnectionApp')
def index():
    return flask.render_template('NESTConnectionApp.html')


@app.route('/selector', methods=['POST', 'GET'])
def add_blog_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        name = flask.request.json['name']
        selection = flask.request.json['selection']
        # print(name)
        # print(selection)
        pp.pprint(flask.request.json)

        getGIDs(name, selection)

        # pp.pprint(nest.GetKernelStatus())

        return name


@app.route('/network', methods=['POST', 'GET'])
def make_network_from_ajax():
    if flask.request.method == 'POST':
        nest.ResetKernel()
        global layers
        layers = {}
        networkSpecs = flask.request.json
        pp = pprint.PrettyPrinter(indent=4)
        for layer in networkSpecs['layers']:
            neurons = layer['neurons']
            pos = [[float(neuron['x']), float(neuron['y'])]
                   for neuron in neurons]
            model = layer['elements']
            nest_layer = tp.CreateLayer({'positions': pos,
                                         'elements': networkSpecs[
                                             'models'][model]})
            layers[layer['name']] = nest_layer
        pp.pprint(layers)
        return 'returnValue'


def getGIDs(name, selection):
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
    mask = nu.make_mask(ll, ur, 'rectangle', cntr)
    gids = tp.SelectNodesByMask(layers[name],
                                cntr, mask)

    print(gids)
    pp = pprint.PrettyPrinter(indent=4)
    pp.pprint(tp.GetPosition(gids))


if __name__ == '__main__':
    layers = {}
    app.run()
