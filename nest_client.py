import json
import threading
import nett_python as nett
import float_message_pb2 as fm
import string_message_pb2 as sm
import nest
import nest.topology as tp


class observe_slot(threading.Thread):

    def __init__(self, slot, message_type, callback):
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
                self.callback(self.msg)
            self.state = not self.state
            self.last_message = self.msg


class NESTClient(object):
    def __init__(self):
        nett.initialize('tcp://127.0.0.1:8000')

        self.slot_out_complete = nett.slot_out_float_message('task_complete')

        self.slot_in_reset = nett.slot_in_float_message()
        self.slot_in_network = nett.slot_in_string_message()
        self.slot_in_reset.connect('tcp://127.0.0.1:2001', 'reset')
        self.slot_in_network.connect('tcp://127.0.0.1:2001', 'network')
        observe_slot_reset = observe_slot(self.slot_in_reset,
                                          fm.float_message(),
                                          self.handle_reset)
        observe_slot_network = observe_slot(self.slot_in_network,
                                            sm.string_message(),
                                            self.handle_make_network_specs)
        print('Client starting to observe')
        observe_slot_reset.start()
        observe_slot_network.start()
        self.send_complete_signal()  # let the server know the client is ready

        self.networkSpecs = {}
        self.layers = {}

    def handle_reset(self, msg):
        print("RESET_KERNEL")
        nest.ResetKernel()
        self.send_complete_signal()

    def send_complete_signal(self):
        msg = fm.float_message()
        msg.value = 1.
        self.slot_out_complete.send(msg.SerializeToString())

    def handle_make_network_specs(self, msg):
        print("MAKE_NODE_NETWORK_SPECS")

        self.networkSpecs = json.loads(msg.value)
        self.make_models()
        self.make_nodes()

    def make_nodes(self):
        print("MAKE_NODES")

        # NOTE: We currently do not take paramaters from users into account,
        # like 'tau' etc.
        if nest.GetKernelStatus()['network_size'] == 1:

            for layer in self.networkSpecs['layers']:
                neurons = layer['neurons']
                if self.networkSpecs['is3DLayer']:
                    pos = [[float(neuron['x']), float(neuron['y']), float(neuron['z'])]
                       for neuron in neurons]
                else:
                    pos = [[float(neuron['x']), float(neuron['y'])]
                           for neuron in neurons]
                model = layer['elements']
                if isinstance(model, list):
                    elem = []
                    for mod in model:
                        if isinstance(mod, str):
                            elem.append(networkSpecs['models'][mod])
                        else:
                            elem.append(mod)
                    #elem = [ networkSpecs['models'][mod] for mod in model]
                else:
                    elem = self.networkSpecs['models'][model]
                # TODO: Use models from make_models!

                extent = layer['extent']
                center = layer['center']
                if not self.networkSpecs['is3DLayer']:
                    extent = extent[:-1]
                    center = center[:-1]
                nest_layer = tp.CreateLayer({'positions': pos,
                                             'extent': [float(ext) for ext in extent],  # JSON converts the double to int
                                             'center': [float(cntr) for cntr in center],
                                             'elements': elem})
                self.layers[layer['name']] = nest_layer

        print("layers: ", self.layers)

    def make_models(self):
        print("MAKE_MODELS")
        
        # NOTE: We currently do not take paramaters from users into account,
        # like 'tau' etc.
        models = self.networkSpecs['models']
        for new_mod, old_mod in models.items():
            nest.CopyModel(old_mod, new_mod)


if __name__ == '__main__':
    client = NESTClient()
