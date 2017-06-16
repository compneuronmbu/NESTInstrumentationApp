from __future__ import print_function
import pprint
import flask
import nest_utils as nu

app = flask.Flask(__name__)


@app.route('/')
def redirect():
    return flask.redirect(flask.url_for('index'))


@app.route('/NESTConnectionApp')
def index():
    return flask.render_template('NESTConnectionApp.html')


@app.route('/selector', methods=['POST', 'GET'])
def add_blog_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        name = flask.request.json['name']
        # print(name)
        # print(selection)
        pp.pprint(flask.request.json)
        gids, positions = nu.printGIDs(flask.request.json)
        print(gids)
        pp.pprint(positions)

        return name


@app.route('/network', methods=['POST'])
def make_network_from_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        networkSpecs = flask.request.json
        layers = nu.make_network(networkSpecs)
        pp.pprint(layers)
        return 'returnValue'


@app.route('/synapses', methods=['POST'])
def synapses_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        synapses = flask.request.json
        pp.pprint(synapses)
        nu.make_synapse_models(synapses)
        return "returnValue"


@app.route('/connect', methods=['POST'])
def connect_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        connections = flask.request.json
        internal_projections = connections['internal']
        del connections['internal']
        print("#############################")
        pp.pprint(internal_projections)
        print("#############################")
        nu.connect_internal_projections(internal_projections)
        nu.connect_to_devices(connections)
        return "returnValue"


@app.route('/connections', methods=['GET'])
def get_connections_ajax():
    print("Recieved ", flask.request.args.get('input'))
    connections = nu.get_connections()
    return flask.jsonify(connections=len(connections))
    #    connections=[{'pre': c[0], 'post': c[1]}
    #                 for c in connections])


@app.route('/simulate', methods=['GET'])
def simulate_ajax():
    t = flask.request.args.get('time')
    print("Simulating for ", t, "ms")
    nu.simulate(t)
    return flask.jsonify(value=1)


@app.route('/ping', methods=['GET'])
def ping_ajax():
    print("PING!")
    return flask.jsonify(value=1)


if __name__ == '__main__':
    app.run()
