# -*- coding: utf-8 -*-
from __future__ import print_function
import __builtin__  # for Python 3: builtins as __builtin__
import time
import math
import os
import sys
import threading
# import nest
# import nest.topology as tp
import numbers
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm

#nett.initialize('tcp://127.0.0.1:2001')
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
                 device_projections=None):
        self.networkSpecs = networkSpecs
        self.device_projections = device_projections

        # Remember to remove when all is moved to nest_client
        self.layers = {}
        self.rec_devices = []

        nett.initialize('tcp://127.0.0.1:2001')

        self.slot_out_reset = nett.slot_out_float_message('reset')
        self.slot_out_network = nett.slot_out_string_message('network')
        self.slot_out_projections = nett.slot_out_string_message('projections')
        self.slot_out_get_nconnections = nett.slot_out_float_message('get_nconnections')
        self.slot_out_connect = nett.slot_out_float_message('connect')
        self.slot_out_simulate = nett.slot_out_float_message('simulate')

        self.client_complete = False
        self.slot_in_complete = nett.slot_in_float_message()
        self.slot_in_nconnections = nett.slot_in_float_message()
        self.slot_in_complete.connect('tcp://127.0.0.1:8000', 'task_complete')
        self.slot_in_nconnections.connect('tcp://127.0.0.1:8000', 'nconnections')
        self.observe_slot_ready = observe_slot(self.slot_in_complete,
                                          fm.float_message(),
                                          self.handle_complete)
        self.observe_slot_nconnections = observe_slot(self.slot_in_nconnections,
                                                      fm.float_message())
        self.observe_slot_ready.start()
        self.observe_slot_nconnections.start()

        self.start_nest_client()
        self.wait_until_client_finishes()
        self.reset_kernel()
        self.send_device_projections()
        self.reset_complete()
        self.make_network()
        self.wait_until_client_finishes()

        # nest.set_verbosity("M_ERROR")
        # nest.sr("M_ERROR setverbosity")  # While set_verbosity function is broken.

    def start_nest_client(self):
        self.client = sp.Popen(['python', 'nest_client.py'])
        print('NEST client started')

    def terminate_nest_client(self):
        self.client.terminate()
        print('NEST client terminated')
        # self.observe_slot_ready.alive = False
        # self.observe_slot_ready.join()
        # print('Joined observe thread')

    def handle_complete(self, msg):
        print('Received complete signal')
        self.client_complete = True

    def reset_complete(self):
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
        # nest.ResetKernel()
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_reset.send(msg.SerializeToString())
        print('Sent reset')

    def send_device_projections(self):
        msg = sm.string_message()
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
        :returns: two-element touple with a list of GIDs and positions of the
            GIDs
        """
        gids = self.get_gids(selection)
        return (gids, tp.GetPosition(gids))

    def connect_all(self):
        """
        Connects both projections between layers and projections between layers
        and devices.
        """
        # self.connect_internal_projections()
        # self.connect_to_devices()
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_connect.send(msg.SerializeToString())
        print('Sent connect')

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
        # return nest.GetKernelStatus()['num_connections']
        msg = fm.float_message()
        msg.value = 1.
        self.reset_complete()
        self.slot_out_get_nconnections.send(msg.SerializeToString())
        print('Sent get Nconnections')
        self.wait_until_client_finishes()
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
        self.slot_out_reset.send(msg.SerializeToString())
        print('Sent simulate')

    '''
    def prepare_simulation(self):
        """
        Prepares NEST to run a simulation.
        """
        print("Preparing simulation")
        nest.Prepare()

    def run(self, t):
        """
        Runs a simulation for a specified time.

        :param t: time to simulate
        """
        # nest.SetKernelStatus({'print_time': True})

        nest.Run(t)

    def cleanup_simulation(self):
        """
        Make NEST cleanup after a finished simulation.
        """
        print("Cleaning up after simulation")
        nest.Cleanup()
    '''

    def get_device_results(self):
        """
        Gets results from devices.

        :returns: if there are new results from the devices, returns a
            dictionary with these, else returns `None`
        """

        results = {}
        # TODO: Set up on the fly
        recording_events = {'spike_det': {'senders': [], 'times': []},
                            'rec_dev': {'times': [], 'V_m': []}}

        time_array = []
        vm_array = []

        for device_name, device_gid in self.rec_devices:
            status = nest.GetStatus(device_gid)[0]
            if status['n_events'] > 0:
                events = {}
                device_events = status['events']

                # TODO numpy i json?
                if 'voltmeter' in device_name:
                    for e in range(status['n_events']):
                        events[str(device_events['senders'][e])] = [
                            device_events['times'][e],
                            round(device_events['V_m'][e])]
                else:
                    for e in range(status['n_events']):
                        events[str(device_events['senders'][e])] = [
                            device_events['times'][e]]
                results[device_name] = events

                # For plotting: (All should just be one dictionary eventually...)
                if 'spike_detector' in device_name:
                    recording_events['spike_det']['senders'] += (
                        [float(y) for y in device_events['senders']])
                    recording_events['spike_det']['times'] += (
                        [float(x) for x in device_events['times']])
                else:
                    vm_count = -1
                    for count, t in enumerate(device_events['times']):
                        if t not in time_array:
                            time_array.append(t)
                            vm_array.append([])
                            vm_count += 1
                        vm_array[vm_count].append(device_events['V_m'][count])
                    recording_events['rec_dev']['times'] += time_array
                    recording_events['rec_dev']['V_m'] += vm_array

                nest.SetStatus(device_gid, 'n_events', 0)  # reset the device

        if results:
            recording_events['time'] = nest.GetKernelStatus('time')
            return {"stream_results": results,
                    "plot_results": recording_events}
        else:
            return None
