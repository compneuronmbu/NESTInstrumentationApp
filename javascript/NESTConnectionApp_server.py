from __future__ import print_function
import pprint
import flask
import nest
import nest.topology as tp
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
        printGIDs(flask.request.json)
        return name


@app.route('/network', methods=['POST'])
def make_network_from_ajax():
    if flask.request.method == 'POST':
        nest.ResetKernel()
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
        selections = flask.request.json
        pp.pprint(selections)
        nu.connect(selections)
        return "returnValue"


@app.route('/connections', methods=['GET'])
def get_connections_ajax():
    print("Recieved ", flask.request.args.get('input'))
    return flask.jsonify(
        connections=[{'pre': c[0], 'post': c[1]}
                     for c in nest.GetConnections()])


def printGIDs(selection):
    gids = nu.get_gids(selection)

    print(gids)
    pp = pprint.PrettyPrinter(indent=4)
    pp.pprint(tp.GetPosition(gids))


if __name__ == '__main__':
    app.run()
