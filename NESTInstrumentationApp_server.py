# -*- coding: utf-8 -*-
from __future__ import print_function

import subprocess as sp
import gevent
import gevent.wsgi
import gevent.queue
import flask
import flask_socketio
import json
import nest_utils as nu

VERSION = sp.check_output(["git", "describe", "--tags", "--dirty"]).strip()
app = flask.Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Turns off caching
socketio = flask_socketio.SocketIO(app, async_mode='gevent')
interface = {}
busy = []
BUSY_ERRORCODE = 418
subscriptions = {}
abort_sub = {}


def emit_exception(exception, user_id):
    print('An exception was raised:', exception)
    socketio.emit('message',
                  {'message': "{}: {}".format(type(exception).__name__,
                                              exception.args[0] if exception.args else '')},
                  namespace='/message/{}'.format(user_id))


@app.route('/')
def redirect():
    """
    Redirects the client to the right index URL.
    """
    return flask.redirect(flask.url_for('index'))


@app.route('/NESTInstrumentationApp')
def index():
    """
    Renders the index page template and sends it to the client.
    """
    return flask.render_template('NESTInstrumentationApp.html',
                                 version=VERSION)


@app.route('/makeNetwork', methods=['POST'])
def make_network():
    """
    Receives the network and construct the interface.
    """
    data = flask.request.json
    user_id = int(data['userID'])
    print('User ID: {}'.format(user_id))
    global interface

    try:
        if user_id in interface:
            interface[user_id].cease_threads()
            interface[user_id].terminate_nest_client()

        interface[user_id] = nu.NESTInterface(json.dumps(data['network']),
                                              user_id,
                                              socketio=socketio)

    except Exception as exception:
        emit_exception(exception, user_id)

    print(interface)
    return flask.Response(status=204)


@app.route('/selector', methods=['POST', 'GET'])
def print_GIDs():
    """
    Receives the network and selected areas, and prints the GIDs in the
    selected areas to the terminal.
    """
    if flask.request.method == 'POST':
        data = flask.request.json
        user_id = int(data['userID'])

        global busy
        try:
            if user_id in busy:
                print("Cannot select, NEST is busy!")
                return flask.Response(status=BUSY_ERRORCODE)
            busy.append(user_id)
            print('Trying to print gids..')
            interface[user_id].printGIDs(json.dumps(data['info']))
            busy.remove(user_id)
        except Exception as exception:
            emit_exception(exception, user_id)

        return flask.Response(status=204)


@app.route('/connect', methods=['POST'])
def connect_ajax():
    """
    Receives the network and projections, and connects them.
    """
    print("Connect called")
    if flask.request.method == 'POST':
        global interface
        data = flask.request.json
        projections = json.dumps(data['projections'])
        user_id = int(data['userID'])
        try:
            if user_id in busy:
                print("Cannot connect, NEST is busy!")
                return flask.Response(status=BUSY_ERRORCODE)

            print('Projections:')
            print(projections)

            interface[user_id].device_projections = projections
            interface[user_id].send_device_projections()

            interface[user_id].connect_all()
        except Exception as exception:
            emit_exception(exception, user_id)
        return flask.Response(status=204)


@app.route('/connections', methods=['GET'])
def get_connections_ajax():
    """
    Sends the number of current connections to the client.
    """
    global interface
    print("Received ", flask.request.args.get('input'))
    user_id = flask.request.args.get('userID')
    n_connections = 0
    try:
        n_connections = interface[int(user_id)].get_num_connections()
    except Exception as exception:
        emit_exception(exception, user_id)
    return flask.jsonify(connections=n_connections)


@app.route('/simulate', methods=['POST'])
def simulate_ajax():
    """
    Receives the network and projections, connects them and simulates.
    """
    global interface
    global busy

    data = flask.request.json
    projections = json.dumps(data['projections'])
    user_id = int(data['userID'])
    try:
        if user_id in busy:
            print("Cannot simulate, NEST is busy!")
            return flask.Response(status=BUSY_ERRORCODE)
        t = float(data['time'])

        busy.append(user_id)
        interface[user_id].device_projections = projections
        interface[user_id].send_device_projections()
        interface[user_id].connect_all()

        print("Simulating for ", t, "ms ...")
        interface[user_id].simulate(t)
        interface[user_id].simulate(-1)
        busy.remove(user_id)
    except Exception as exception:
        emit_exception(exception, user_id)

    return flask.Response(status=204)


def g_simulate(network, projections, t, user_id):
    """
    Runs a simulation in steps. This way the client can be updated on the
    status of the simulation.

    :param network: network specifications
    :param projections: projections between layers and devices
    :param t: time to simulate
    """
    global interface
    global busy
    global subscriptions

    try:
        busy.append(user_id)

        interface[user_id].device_projections = projections
        interface[user_id].send_device_projections()
        interface[user_id].connect_all()
        interface[user_id].device_results = '{}'

        q = gevent.queue.Queue()
        abort_sub[user_id] = q

        steps = 1000
        sleep_t = 0.1  # sleep time
        dt = float(t) / steps

        for i in range(steps):
            print(i)
            if not q.empty():
                abort = q.get()
                if abort:
                    print("Simulation aborted")
                    break
            interface[user_id].simulate(dt)
            device_results = None
            while device_results is None:
                device_results = interface[user_id].get_device_results()
                if device_results is None:
                    # Waiting for results
                    gevent.sleep(sleep_t)
            results = json.loads(device_results)
            if results:
                jsonResult = flask.json.dumps(results)
                if user_id in subscriptions:
                    subscriptions[user_id].put(jsonResult)
            interface[user_id].device_results = '{}'
            # Yield this context to check abort and send data
            gevent.sleep(sleep_t)

        interface[user_id].simulate(-1)

        busy.remove(user_id)

        if user_id in subscriptions:
            subscriptions[user_id].put(
                flask.json.dumps({"simulation_end": True}))
    except Exception as exception:
        emit_exception(exception, user_id)


@app.route('/streamSimulate', methods=['POST'])
def streamSimulate():
    """
    Receive data from the client and run a simulation in steps.
    """
    data = flask.request.json
    network = json.dumps(data['network'])
    projections = json.dumps(data['projections'])
    user_id = int(data['userID'])
    try:
        if user_id in busy:
            print("Cannot simulate, NEST is busy!")
            return flask.Response(status=BUSY_ERRORCODE)

        t = data['time']

        print("Simulating for ", t, "ms")
        gevent.spawn(g_simulate, network, projections, t, user_id)
    except Exception as exception:
        emit_exception(exception, user_id)
    return flask.Response(status=204)


@app.route('/abortSimulation', methods=['POST'])
def abortSimulation():
    """
    Abort the currently running simulation.
    """
    global abort_sub
    user_id = int(flask.request.json['userID'])
    try:
        if user_id in abort_sub:
            abort_sub[user_id].put(True)
    except Exception as exception:
        emit_exception(exception, user_id)
    return flask.Response(status=204)


@app.route('/simulationData/<int:user_id>')
def simulationData(user_id):
    """
    Lets the client listen to this URL to get updates on the simulation status.
    """
    global subscriptions

    def gen():
        try:
            q = gevent.queue.Queue()
            subscriptions[user_id] = q
            try:
                while True:
                    result = q.get()
                    ev = "data: " + result + "\n\n"
                    yield ev
            except GeneratorExit:
                del subscriptions[user_id]
        except Exception as exception:
            emit_exception(exception, user_id)
    return flask.Response(gen(), mimetype="text/event-stream")


if __name__ == '__main__':
    socketio.run(app,
                 host="",
                 port=7000,
                 log_output=True,
                 keyfile='../certs/fsd-cloud42_zam_kfa-juelich_de.key',
                 certfile='../certs/fsd-cloud42_zam_kfa-juelich_de.pem')
