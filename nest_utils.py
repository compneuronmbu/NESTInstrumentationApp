# -*- coding: utf-8 -*-
from __future__ import print_function
import __builtin__  # for Python 3: builtins as __builtin__
import time
import os
import sys
import threading
import contextlib
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm

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


# redefine print
def print(*args, **kwargs):
    __builtin__.print('[\033[1m\033[93mserver\033[0m] ', end='')
    return __builtin__.print(*args, **kwargs)


class observe_slot(threading.Thread):

    def __init__(self, slot, message_type, callback=None):
        super(observe_slot, self).__init__()
        self.slot = slot
        self.msg = message_type
        self.last_message = None
        self.state = False
        self.last_message = None
        self.callback = callback

    def get_last_message(self):
        return self.last_message

    def set_state(self, state):
        self.state = state

    def run(self):
        while True:
            self.msg.ParseFromString(self.slot.receive())
            if self.msg.value is not None:
                self.last_message = self.msg.value
                if self.callback is not None:
                    self.callback(self.msg)
            self.state = not self.state
            self.last_message = self.msg

class NESTInterface(object):
    """
    Class for interacting with NEST.

    :param networkSpecs: Dictionary of network specifications, including
                         synapse specifications and projections between layers
    :param device_projections: Optional list of projections between layers and
                               devices
    """

    def __init__(self, networkSpecs,
                 device_projections='[]'):
        self.networkSpecs = networkSpecs
        self.device_projections = device_projections

        # Remember to remove when all is moved to nest_client
        self.layers = {}
        self.rec_devices = []

        #nett.initialize('tcp://127.0.0.1:2001')

        self.slot_out_reset = nett.slot_out_float_message('reset')
        self.slot_out_network = nett.slot_out_string_message('network')
        self.slot_out_get_gids = nett.slot_out_string_message('get_GIDs')
        self.slot_out_projections = nett.slot_out_string_message('projections')
        self.slot_out_connect = nett.slot_out_float_message('connect')
        self.slot_out_get_nconnections = nett.slot_out_float_message('get_nconnections')
        self.slot_out_simulate = nett.slot_out_float_message('simulate')

        self.client_complete = False
        self.slot_in_complete = nett.slot_in_float_message()
        self.slot_in_nconnections = nett.slot_in_float_message()
        self.slot_in_gids = nett.slot_in_string_message()
        self.slot_in_device_results = nett.slot_in_string_message()

        self.slot_in_complete.connect('tcp://127.0.0.1:8000', 'task_complete')
        self.slot_in_nconnections.connect('tcp://127.0.0.1:8000', 'nconnections')
        self.slot_in_gids.connect('tcp://127.0.0.1:8000', 'GIDs')
        self.slot_in_device_results.connect('tcp://127.0.0.1:8000', 'device_results')

        self.observe_slot_ready = observe_slot(self.slot_in_complete,
                                          fm.float_message(),
                                          self.handle_complete)
        self.observe_slot_nconnections = observe_slot(self.slot_in_nconnections,
                                                      fm.float_message())
        self.observe_slot_gids = observe_slot(self.slot_in_gids,
                                              sm.string_message())
        self.observe_slot_device_results = observe_slot(self.slot_in_device_results,
                                                        sm.string_message(),
                                                        self.handle_device_results)

        self.observe_slot_ready.start()
        self.observe_slot_nconnections.start()
        self.observe_slot_gids.start()
        self.observe_slot_device_results.start()

        with self.wait_for_client():
            self.start_nest_client()
        self.reset_kernel()
        self.send_device_projections()
        with self.wait_for_client():
            self.make_network()

    @contextlib.contextmanager
    def wait_for_client(self):
        self.reset_complete_signal()
        yield
        self.wait_until_client_finishes()

    def start_nest_client(self):
        self.client = sp.Popen(['python', 'nest_client.py'])
        print('NEST client started')

    def terminate_nest_client(self):
        self.client.terminate()
        print('NEST client terminated')

    def handle_complete(self, msg):
        print('Received complete signal')
        self.client_complete = True

    def reset_complete_signal(self):
        self.client_complete = False

    def wait_until_client_finishes(self):
        print('Waiting for client...')
        while not self.client_complete:
            # print('Waiting for client...')
            time.sleep(0.2)

    def reset_kernel(self):
        """
        Resets the NEST kernel.
        """
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_reset.send(msg.SerializeToString())
        print('Sent reset')

    def send_device_projections(self):
        msg = sm.string_message()
        print("device_projections")
        print(self.device_projections)
        msg.value = self.device_projections
        self.slot_out_projections.send(msg.SerializeToString())
        print('Sent projections')

    def make_network(self):
        """
        Creates the layers and models of nodes.
        """
        msg = sm.string_message()
        msg.value = self.networkSpecs
        self.slot_out_network.send(msg.SerializeToString())
        print('Sent make network')

    def printGIDs(self, selection):
        """
        Prints the selected GIDs to terminal.

        :param selection: dictionary containing specifications of the
            selected areas
        :returns: a list of GIDs
        """

        msg = sm.string_message()
        msg.value = selection

        with self.wait_for_client():
            self.slot_out_get_gids.send(msg.SerializeToString())
        print('Sent get GIDs')
        gids = self.observe_slot_gids.get_last_message().value
        return (gids)

    def connect_all(self):
        """
        Connects both projections between layers and projections between layers
        and devices.
        """
        msg = fm.float_message()
        msg.value = 1.
        print('Sending connect')
        with self.wait_for_client():
            self.slot_out_connect.send(msg.SerializeToString())

    def get_connections(self):
        """
        Gets all connections from NEST.

        :returns: list of connections
        """
        return nest.GetConnections()

    def get_num_connections(self):
        """
        Gets the number of connections.

        :returns: number of connections
        """
        msg = fm.float_message()
        msg.value = 1.
        print('Sending get Nconnections')
        with self.wait_for_client():
            self.slot_out_get_nconnections.send(msg.SerializeToString())
        nconnections = int(self.observe_slot_nconnections.get_last_message().value)
        print("Nconnections: {}".format(nconnections))
        return nconnections

    def simulate(self, t):
        """
        Runs a simulation for a specified time.

        :param t: time to simulate
        """
        msg = fm.float_message()
        msg.value = t
        print('Sending simulate for {} ms'.format(t))
        with self.wait_for_client():
            self.slot_out_simulate.send(msg.SerializeToString())

    def handle_device_results(self, msg):
        print('Received device results:\n' +
              '{:>{width}}'.format(msg.value, width=len(msg.value) + 9))
