from __future__ import print_function
import sys
import pprint
import gevent
import gevent.wsgi
import gevent.queue
import flask
import nest_utils as nu

app = flask.Flask(__name__)
subscriptions = []
abort_sub = []


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
        # print(name)
        # print(selection)
        data = flask.request.json
        # pp.pprint(data)
        nu.make_network(data['network'])
        gids, positions = nu.printGIDs(data['info'])
        print(gids)
        pp.pprint(positions)
        name = data['info']['name']

        return name


@app.route('/connect', methods=['POST'])
def connect_ajax():
    print("Connect called")
    if flask.request.method == 'POST':
        data = flask.request.json
        network = data['network']
        synapses = data['synapses']
        projections = data['projections']

        nu.make_network(network)
        nu.make_synapse_models(synapses)
        nu.connect_all(projections)

        return flask.Response(status=204)


@app.route('/connections', methods=['GET'])
def get_connections_ajax():
    print("Recieved ", flask.request.args.get('input'))
    connections = nu.get_connections()
    return flask.jsonify(connections=len(connections))
    #    connections=[{'pre': c[0], 'post': c[1]}
    #                 for c in connections])


@app.route('/simulate', methods=['POST'])
def simulate_ajax():
    #t = flask.request.args.get('time')
    #print("Simulating for ", t, "ms")
    #events = nu.simulate(t)

    #return flask.jsonify(spikeEvents=events)

    data = flask.request.json
    network = data['network']
    synapses = data['synapses']
    projections = data['projections']
    t = data['time']

    nu.make_network(network)
    nu.make_synapse_models(synapses)
    nu.connect_all(projections)

    nu.prepare_simulation()
    print("Simulating for ", t, "ms ...")
    nu.simulate(t)
    nu.cleanup_simulation()
    return flask.Response(status=204)


def g_simulate(network, synapses, projections, t):
    nu.make_network(network)
    nu.make_synapse_models(synapses)
    nu.connect_all(projections)

    q = gevent.queue.Queue()
    abort_sub.append(q)

    steps = 10000
    sleep_t = 0.00001  # sleep time
    dt = float(t) / steps
    print("dt=%f" % dt)
    nu.prepare_simulation()
    for i in range(steps):
        if not q.empty():
            abort = q.get()
            if abort:
                print("Simulation aborted")
                break
        if i % 10 == 0 and i > 0:
            sys.stdout.write("\rStep %i" % i)
            sys.stdout.flush()
        nu.simulate(dt)
        # if i % 10 == 0:
        #    continue
        results = nu.get_device_results()
        if results:
            jsonResult = flask.json.dumps(results)
            for sub in subscriptions:
                sub.put(jsonResult)
        # yield this context to check abort and send data
        gevent.sleep(sleep_t)
    print("")
    nu.cleanup_simulation()


@app.route('/streamSimulate', methods=['POST'])
def streamSimulate():
    print("publish")

    data = flask.request.json
    network = data['network']
    synapses = data['synapses']
    projections = data['projections']
    t = data['time']

    print("Simulating for ", t, "ms")
    gevent.spawn(g_simulate, network, synapses, projections, t)

    return flask.Response(status=204)


@app.route('/abortSimulation')
def abortSimulation():
    for sub in abort_sub:
        sub.put(True)
    return flask.Response(status=204)


@app.route('/simulationData')
def simulationData():

    def gen():
        q = gevent.queue.Queue()
        subscriptions.append(q)
        try:
            while True:
                result = q.get()
                ev = str("data: " + result + "\n\n")
                yield ev
        except GeneratorExit:
            subscriptions.remove(q)
    return flask.Response(gen(), mimetype="text/event-stream")


if __name__ == '__main__':
    # app.run()
    server = gevent.wsgi.WSGIServer(("", 5000), app)
    server.serve_forever()
