# -*- coding: utf-8 -*-
from __future__ import print_function

import sys
import pprint
import gevent
import gevent.wsgi
import gevent.queue
import flask
import json
import nest_utils as nu

app = flask.Flask(__name__)
interface = None
busy = False
BUSY_ERRORCODE = 418
subscriptions = []
abort_sub = []


@app.route('/')
def redirect():
    """
    Redirects the client to the right index URL.
    """
    return flask.redirect(flask.url_for('index'))


@app.route('/NESTConnectionApp')
def index():
    """
    Renders the index page template and sends it to the client.
    """
    return flask.render_template('NESTConnectionApp.html')


@app.route('/makeNetwork', methods=['POST'])
def make_network():
    """
    Receives the network and construct the interface.
    """
    data = flask.request.json
    global interface
    interface = nu.NESTInterface(json.dumps(data['network']))

    return flask.Response(status=204)


@app.route('/selector', methods=['POST', 'GET'])
def print_GIDs():
    """
    Receives the network and selected areas, and prints the GIDs in the
    selected areas to the terminal.
    """
    if flask.request.method == 'POST':
        global busy

        if busy:
            print("Cannot select, NEST is busy!")
            return flask.Response(status=BUSY_ERRORCODE)
        busy = True

        data = flask.request.json
        print('Trying to print gids..')
        interface.printGIDs(json.dumps(data['info']))
        busy = False

        return flask.Response(status=204)


@app.route('/connect', methods=['POST'])
def connect_ajax():
    """
    Receives the network and projections, and connects them.
    """
    print("Connect called")
    if flask.request.method == 'POST':
        global interface
        if busy:
            print("Cannot connect, NEST is busy!")
            return flask.Response(status=BUSY_ERRORCODE)
        data = flask.request.json
        projections = json.dumps(data['projections'])

        pp = pprint.PrettyPrinter(indent=4)
        print('Projections:')
        print(projections)

        interface.device_projections = projections
        interface.send_device_projections()

        interface.connect_all()
        return flask.Response(status=204)


@app.route('/connections', methods=['GET'])
def get_connections_ajax():
    """
    Sends the number of current connections to the client.
    """
    global interface
    print("Received ", flask.request.args.get('input'))
    n_connections = interface.get_num_connections()
    return flask.jsonify(connections=n_connections)
    #    connections=[{'pre': c[0], 'post': c[1]}
    #                 for c in connections])


@app.route('/simulate', methods=['POST'])
def simulate_ajax():
    """
    Receives the network and projections, connects them and simulates.
    """
    global interface
    global busy

    if busy:
        print("Cannot simulate, NEST is busy!")
        return flask.Response(status=BUSY_ERRORCODE)
    data = flask.request.json
    projections = json.dumps(data['projections'])
    t = float(data['time'])

    busy = True
    interface.device_projections = projections
    interface.send_device_projections()
    interface.connect_all()

    print("Simulating for ", t, "ms ...")
    interface.simulate(t)
    busy = False

    return flask.Response(status=204)


def g_simulate(network, projections, t):
    """
    Runs a simulation in steps. This way the client can be updated on the
    status of the simulation.

    :param network: network specifications
    :param projections: projections between layers and devices
    :param t: time to simulate
    """
    global interface
    global busy
    busy = True

    interface.device_projections = projections

    interface.send_device_projections()
    interface.connect_all()

    q = gevent.queue.Queue()
    abort_sub.append(q)

    steps = 1000
    sleep_t = 0.1  # sleep time
    dt = float(t) / steps
    print("dt=%f" % dt)
    interface.prepare_simulation()
    for i in range(steps):
        print("step: ", i)
        if not q.empty():
            abort = q.get()
            if abort:
                print("Simulation aborted")
                break
        #if i % 10 == 0 and i > 0:
        #    sys.stdout.write("\rStep %i" % i)
        #    sys.stdout.flush()
        interface.run(dt)
        # if i % 10 == 0:
        #    continue
        results = interface.get_device_results()
        if results:
            jsonResult = flask.json.dumps(results)
            for sub in subscriptions:
                sub.put(jsonResult)
        # yield this context to check abort and send data
        gevent.sleep(sleep_t)
    print("")
    interface.cleanup_simulation()

    busy = False

    for sub in subscriptions:
        sub.put(flask.json.dumps({"simulation_end": True}))


@app.route('/streamSimulate', methods=['POST'])
def streamSimulate():
    """
    Receive data from the client and run a simulation in steps.
    """
    if busy:
        print("Cannot simulate, NEST is busy!")
        return flask.Response(status=BUSY_ERRORCODE)

    data = flask.request.json
    network = json.dumps(data['network'])
    projections = json.dumps(data['projections'])
    t = data['time']

    print("Simulating for ", t, "ms")
    gevent.spawn(g_simulate, network, projections, t)

    return flask.Response(status=204)


@app.route('/abortSimulation')
def abortSimulation():
    """
    Abort the currently running simulation.
    """
    for sub in abort_sub:
        sub.put(True)
    return flask.Response(status=204)


@app.route('/simulationData')
def simulationData():
    """
    Lets the client listen to this URL to get updates on the simulation status.
    """

    def gen():
        q = gevent.queue.Queue()
        subscriptions.append(q)
        try:
            while True:
                result = q.get()
                ev = "data: " + result + "\n\n"
                yield ev
        except GeneratorExit:
            subscriptions.remove(q)
    return flask.Response(gen(), mimetype="text/event-stream")


if __name__ == '__main__':
    # app.run()

    #print('Serving on https://127.0.0.1:8443/NESTConnectionApp')
    #server = pywsgi.WSGIServer(('', 8443), app, keyfile='server.key', certfile='server.crt')
    #print('Serving on http://127.0.0.1:5000/NESTConnectionApp')
    server = gevent.pywsgi.WSGIServer(("", 5000), app)
    server.serve_forever()
