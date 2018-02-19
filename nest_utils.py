# -*- coding: utf-8 -*-
from __future__ import print_function
import __builtin__  # for Python 3: builtins as __builtin__
import os
import sys
import threading
import time
import random
import atexit
import contextlib
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm

nett = reload(nett)  # In case nett has been changed by the testsuite.
nett.initialize('tcp://127.0.0.1:2001')

if os.name == 'posix' and sys.version_info[0] < 3:
    # Import a backport of the subprocess module from Python 3 for Python 2
    try:
        import subprocess32 as sp
    except ImportError:
        print('Module subprocess32 not found, using old subprocess module.')
        import subprocess as sp
else:
    import subprocess as sp


def print(*args, **kwargs):
    """
    A cosmetic change to the print function to show more clearly which script
    is actually printing when we are running the NESTClient in the same
    terminal.
    """
    __builtin__.print('[\033[1m\033[93mserver\033[0m] ', end='')
    return __builtin__.print(*args, **kwargs)


class observe_slot(threading.Thread):
    """
    A listener for messages from the NESTClient. Each listener spawns its own
    thread.

    :param slot: The nett type slot to receive from
    :param message_type: The nett type data-type to receive
    :param callback: Optional function to call on receiving data
    """

    def __init__(self, slot, message_type, callback=None):
        super(observe_slot, self).__init__()
        self.slot = slot
        self.msg = message_type
        self.last_message = None
        self.last_message = None
        self.callback = callback
        self.daemon = True
        self.ceased = False

    def get_last_message(self):
        """
        Gets the last message received.

        :returns: The last message received
        """
        return self.last_message

    def run(self):
        """
        Runs the thread.
        """
        while not self.ceased:
            self.msg.ParseFromString(self.slot.receive())
            if self.ceased:
                break
            if self.msg.value is not None:
                self.last_message = self.msg
                if self.callback is not None:
                    self.callback(self.msg)
            self.last_message = self.msg


class NESTInterface(object):
    """
    For interacting with the NESTClient.

    :param networkSpecs: Dictionary of network specifications, including
                         synapse specifications and projections between layers
    :param device_projections: Optional list of projections between layers and
                               devices
    """

    def __init__(self, networkSpecs,
                 user_id,
                 device_projections='[]',
                 silent=False,
                 socketio=None):
        self.networkSpecs = networkSpecs
        self.device_projections = device_projections
        self.user_id = user_id
        self.device_results = '{}'
        self.silent = silent
        self.socketio = socketio

        atexit.register(self.terminate_nest_client)

        self.slot_out_data = nett.slot_out_string_message('data_{}'.format(self.user_id))

        self.slot_in_complete = nett.slot_in_float_message()
        self.slot_in_nconnections = nett.slot_in_float_message()
        # self.slot_in_gids = nett.slot_in_string_message()
        self.slot_in_device_results = nett.slot_in_string_message()
        self.slot_in_status_message = nett.slot_in_string_message()

        random.seed(self.user_id)
        port_increment = random.randint(1, 1000)
        client_address = 'tcp://127.0.0.1:{}'.format(8000 + port_increment)
        self.slot_in_complete.connect(client_address,
                                      'task_complete_{}'.format(self.user_id))
        self.slot_in_nconnections.connect(client_address,
                                          'nconnections_{}'.format(self.user_id))
        # self.slot_in_gids.connect(client_address, 'GIDs')
        self.slot_in_device_results.connect(client_address,
                                            'device_results_{}'.format(self.user_id))
        self.slot_in_status_message.connect(client_address,
                                            'status_message_{}'.format(self.user_id))

        self.observe_slot_ready = observe_slot(self.slot_in_complete,
                                               fm.float_message(),
                                               self.handle_complete)
        self.observe_slot_nconnections = observe_slot(
            self.slot_in_nconnections,
            fm.float_message())
        self.observe_slot_device_results = observe_slot(
            self.slot_in_device_results,
            sm.string_message(),
            self.handle_device_results)
        self.observe_slot_status_message = observe_slot(
            self.slot_in_status_message,
            sm.string_message(),
            self.handle_status_message)

        self.observe_slot_ready.start()
        self.observe_slot_nconnections.start()
        # self.observe_slot_gids.start()
        self.observe_slot_device_results.start()
        self.observe_slot_status_message.start()

        self.event = threading.Event()

        with self.wait_for_client(10):
            self.start_nest_client()
        with self.wait_for_client():
            self.reset_kernel()
        if self.device_projections != '[]':
            self.send_device_projections()
        with self.wait_for_client():
            self.make_network()

    def print(self, *args, **kwargs):
        """
        Wrapper around the print function to handle silent mode.
        """
        if not self.silent:
            print(*args, **kwargs)

    @contextlib.contextmanager
    def wait_for_client(self, timeout=None):
        """
        Context manager for waiting for the client.
        """
        self.reset_complete_signal()
        yield
        self.wait_until_client_finishes(timeout)

    def get_valid_msg_value(self, observer):
        timeout = 10
        n = 0
        while observer.get_last_message() is None:
            time.sleep(0.1)
            n += 1
            if n == timeout:
                return -1
        return observer.get_last_message().value

    def start_nest_client(self):
        """
        Starting the NEST client in a separate process using the subprocess
        module.
        """
        cmd = ['python', 'nest_client.py', self.user_id]
        if self.silent:
            self.client = sp.Popen(cmd + ['-s'], stdout=sp.PIPE)
        else:
            self.client = sp.Popen(cmd)
        self.print('NEST client started')

    def terminate_nest_client(self):
        """
        Terminates the NEST client subprocess.
        """
        self.client.terminate()
        stdout, stderr = self.client.communicate()

    def cease_threads(self):
        """
        Marks the current observing threads as obsolete, so they will stop at
        the first available opportunity.
        """
        threads = [self.observe_slot_ready, self.observe_slot_nconnections,
                   self.observe_slot_device_results,
                   self.observe_slot_status_message]
        for thread in threads:
            thread.ceased = True
        # The threads are blocking until they receive a message. Therefore we
        # make the client ping all slots so that all threads are terminated.
        self.send_to_client('ping')
        for thread in threads:
            thread.join()
        # Should be only the main thread now.
        assert len(threading.enumerate()) == 1

    def handle_complete(self, msg):
        """
        Handles receiving complete signal from the client.

        :param msg: The nett type message received.
        """
        self.print('Received complete signal')
        self.event.set()

    def reset_complete_signal(self):
        """
        Resets the complete signal.
        """
        self.event.clear()

    def wait_until_client_finishes(self, timeout=None):
        """
        Blocks until complete signal from the client is received.
        """
        self.print('Waiting for client...')
        recv_flag = self.event.wait(timeout)
        if not recv_flag:
            self.print('WARNING: Event timed out')

    def send_to_client(self, label, data=''):
        """
        Sends a command or data to the NEST client.

        :param label: Command or label for the data
        :param data: Data to send
        """
        # TODO: check that label and data are strings
        msg = sm.string_message()
        msg.value = label + ' ' * bool(data) + data
        self.slot_out_data.send(msg.SerializeToString())

    def reset_kernel(self):
        """
        Resets the NEST kernel.
        """
        self.send_to_client('reset')
        self.print('Sent reset')

    def send_device_projections(self):
        """
        Sends projections to the NEST client.
        """
        with self.wait_for_client():
            self.send_to_client('projections', self.device_projections)
        self.print('Sent projections')

    def make_network(self):
        """
        Sends the network specifications to the NEST client, which then creates
        the layers and models of nodes.
        """
        self.send_to_client('make_network', self.networkSpecs)
        # msg = sm.string_message()
        # msg.value = self.networkSpecs
        # self.slot_out_network.send(msg.SerializeToString())
        self.print('Sent make network')

    def printGIDs(self, selection):
        """
        Prints the selected GIDs to terminal.

        :param selection: dictionary containing specifications of the
            selected areas
        :returns: a list of GIDs
        """
        self.print('Sending get GIDs')
        with self.wait_for_client():
            self.send_to_client('get_gids', selection)

    def connect_all(self):
        """
        Connects both projections between layers and projections between layers
        and devices.
        """
        self.print('Sending connect')
        with self.wait_for_client():
            self.send_to_client('connect')
        self.print("Connection complete")

    def get_num_connections(self):
        """
        Gets the number of connections.

        :returns: number of connections
        """
        self.print('Sending get Nconnections')
        with self.wait_for_client():
            self.send_to_client('get_nconnections')
        nconnections = int(
            self.get_valid_msg_value(self.observe_slot_nconnections))
        self.print("Nconnections: {}".format(nconnections))
        return nconnections

    def simulate(self, t):
        """
        Runs a simulation for a specified time.

        :param t: time to simulate
        """
        self.send_to_client('simulate', str(t))

    def handle_device_results(self, msg):
        """
        Handles receiving device results.

        :param msg: Nett type message with the device results
        """
        self.print('Received device results:\n' +
                   '{:>{width}}'.format(msg.value, width=len(msg.value) + 9))
        self.device_results = msg.value

    def get_device_results(self):
        return self.device_results

    def handle_status_message(self, msg):
        """
        Handles receiving status messages from the NEST client.

        :param msg: Nett type message with the status message
        """
        self.print('Received status message:\n' +
                   '{:>{width}}'.format(msg.value, width=len(msg.value) + 9))

        self.socketio.emit('message',
                           {'message': msg.value})
        # TODO: Use namespace to send to different clients
        print('Sent socket msg')
