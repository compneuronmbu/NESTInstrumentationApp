import unittest
import nest_utils as nu
import json

nett_spec = {"syn_models": [["static_synapse", "static_excitatory", {}]], "models": {"excitatory": "iaf_psc_alpha"}, "layers": [{"neurons": [{"x": -2.0, "y": -2.0, "z": -2.0}, {"x": -2.0, "y": -2.0, "z": -1.0}, {"x": -2.0, "y": -2.0, "z": 0.0}, {"x": -2.0, "y": -2.0, "z": 1.0}, {"x": -2.0, "y": -2.0, "z": 2.0}, {"x": -2.0, "y": -1.0, "z": -2.0}, {"x": -2.0, "y": -1.0, "z": -1.0}, {"x": -2.0, "y": -1.0, "z": 0.0}, {"x": -2.0, "y": -1.0, "z": 1.0}, {"x": -2.0, "y": -1.0, "z": 2.0}, {"x": -2.0, "y": 0.0, "z": -2.0}, {"x": -2.0, "y": 0.0, "z": -1.0}, {"x": -2.0, "y": 0.0, "z": 0.0}, {"x": -2.0, "y": 0.0, "z": 1.0}, {"x": -2.0, "y": 0.0, "z": 2.0}, {"x": -2.0, "y": 1.0, "z": -2.0}, {"x": -2.0, "y": 1.0, "z": -1.0}, {"x": -2.0, "y": 1.0, "z": 0.0}, {"x": -2.0, "y": 1.0, "z": 1.0}, {"x": -2.0, "y": 1.0, "z": 2.0}, {"x": -2.0, "y": 2.0, "z": -2.0}, {"x": -2.0, "y": 2.0, "z": -1.0}, {"x": -2.0, "y": 2.0, "z": 0.0}, {"x": -2.0, "y": 2.0, "z": 1.0}, {"x": -2.0, "y": 2.0, "z": 2.0}, {"x": -1.0, "y": -2.0, "z": -2.0}, {"x": -1.0, "y": -2.0, "z": -1.0}, {"x": -1.0, "y": -2.0, "z": 0.0}, {"x": -1.0, "y": -2.0, "z": 1.0}, {"x": -1.0, "y": -2.0, "z": 2.0}, {"x": -1.0, "y": -1.0, "z": -2.0}, {"x": -1.0, "y": -1.0, "z": -1.0}, {"x": -1.0, "y": -1.0, "z": 0.0}, {"x": -1.0, "y": -1.0, "z": 1.0}, {"x": -1.0, "y": -1.0, "z": 2.0}, {"x": -1.0, "y": 0.0, "z": -2.0}, {"x": -1.0, "y": 0.0, "z": -1.0}, {"x": -1.0, "y": 0.0, "z": 0.0}, {"x": -1.0, "y": 0.0, "z": 1.0}, {"x": -1.0, "y": 0.0, "z": 2.0}, {"x": -1.0, "y": 1.0, "z": -2.0}, {"x": -1.0, "y": 1.0, "z": -1.0}, {"x": -1.0, "y": 1.0, "z": 0.0}, {"x": -1.0, "y": 1.0, "z": 1.0}, {"x": -1.0, "y": 1.0, "z": 2.0}, {"x": -1.0, "y": 2.0, "z": -2.0}, {"x": -1.0, "y": 2.0, "z": -1.0}, {"x": -1.0, "y": 2.0, "z": 0.0}, {"x": -1.0, "y": 2.0, "z": 1.0}, {"x": -1.0, "y": 2.0, "z": 2.0}, {"x": 0.0, "y": -2.0, "z": -2.0}, {"x": 0.0, "y": -2.0, "z": -1.0}, {"x": 0.0, "y": -2.0, "z": 0.0}, {"x": 0.0, "y": -2.0, "z": 1.0}, {"x": 0.0, "y": -2.0, "z": 2.0}, {"x": 0.0, "y": -1.0, "z": -2.0}, {"x": 0.0, "y": -1.0, "z": -1.0}, {"x": 0.0, "y": -1.0, "z": 0.0}, {"x": 0.0, "y": -1.0, "z": 1.0}, {"x": 0.0, "y": -1.0, "z": 2.0}, {"x": 0.0, "y": 0.0, "z": -2.0}, {"x": 0.0, "y": 0.0, "z": -1.0}, {"x": 0.0, "y": 0.0, "z": 0.0}, {"x": 0.0, "y": 0.0, "z": 1.0}, {"x": 0.0, "y": 0.0, "z": 2.0}, {"x": 0.0, "y": 1.0, "z": -2.0}, {"x": 0.0, "y": 1.0, "z": -1.0}, {"x": 0.0, "y": 1.0, "z": 0.0}, {"x": 0.0, "y": 1.0, "z": 1.0}, {"x": 0.0, "y": 1.0, "z": 2.0}, {"x": 0.0, "y": 2.0, "z": -2.0}, {"x": 0.0, "y": 2.0, "z": -1.0}, {"x": 0.0, "y": 2.0, "z": 0.0}, {"x": 0.0, "y": 2.0, "z": 1.0}, {"x": 0.0, "y": 2.0, "z": 2.0}, {"x": 1.0, "y": -2.0, "z": -2.0}, {"x": 1.0, "y": -2.0, "z": -1.0}, {"x": 1.0, "y": -2.0, "z": 0.0}, {"x": 1.0, "y": -2.0, "z": 1.0}, {"x": 1.0, "y": -2.0, "z": 2.0}, {"x": 1.0, "y": -1.0, "z": -2.0}, {"x": 1.0, "y": -1.0, "z": -1.0}, {"x": 1.0, "y": -1.0, "z": 0.0}, {"x": 1.0, "y": -1.0, "z": 1.0}, {"x": 1.0, "y": -1.0, "z": 2.0}, {"x": 1.0, "y": 0.0, "z": -2.0}, {"x": 1.0, "y": 0.0, "z": -1.0}, {"x": 1.0, "y": 0.0, "z": 0.0}, {"x": 1.0, "y": 0.0, "z": 1.0}, {"x": 1.0, "y": 0.0, "z": 2.0}, {"x": 1.0, "y": 1.0, "z": -2.0}, {"x": 1.0, "y": 1.0, "z": -1.0}, {"x": 1.0, "y": 1.0, "z": 0.0}, {"x": 1.0, "y": 1.0, "z": 1.0}, {"x": 1.0, "y": 1.0, "z": 2.0}, {"x": 1.0, "y": 2.0, "z": -2.0}, {"x": 1.0, "y": 2.0, "z": -1.0}, {"x": 1.0, "y": 2.0, "z": 0.0}, {"x": 1.0, "y": 2.0, "z": 1.0}, {"x": 1.0, "y": 2.0, "z": 2.0}, {"x": 2.0, "y": -2.0, "z": -2.0}, {"x": 2.0, "y": -2.0, "z": -1.0}, {"x": 2.0, "y": -2.0, "z": 0.0}, {"x": 2.0, "y": -2.0, "z": 1.0}, {"x": 2.0, "y": -2.0, "z": 2.0}, {"x": 2.0, "y": -1.0, "z": -2.0}, {"x": 2.0, "y": -1.0, "z": -1.0}, {"x": 2.0, "y": -1.0, "z": 0.0}, {"x": 2.0, "y": -1.0, "z": 1.0}, {"x": 2.0, "y": -1.0, "z": 2.0}, {"x": 2.0, "y": 0.0, "z": -2.0}, {"x": 2.0, "y": 0.0, "z": -1.0}, {"x": 2.0, "y": 0.0, "z": 0.0}, {"x": 2.0, "y": 0.0, "z": 1.0}, {"x": 2.0, "y": 0.0, "z": 2.0}, {"x": 2.0, "y": 1.0, "z": -2.0}, {"x": 2.0, "y": 1.0, "z": -1.0}, {"x": 2.0, "y": 1.0, "z": 0.0}, {"x": 2.0, "y": 1.0, "z": 1.0}, {"x": 2.0, "y": 1.0, "z": 2.0}, {"x": 2.0, "y": 2.0, "z": -2.0}, {"x": 2.0, "y": 2.0, "z": -1.0}, {"x": 2.0, "y": 2.0, "z": 0.0}, {"x": 2.0, "y": 2.0, "z": 1.0}, {"x": 2.0, "y": 2.0, "z": 2.0}], "elements": "excitatory", "center": [0.0, 0.0, 0.0], "extent": [5.0, 5.0, 5.0], "name": "exAndIn", "neuronType": ""}], "projections": [["exAndIn", "exAndIn", {"synapse_model": "static_synapse", "kernel": 0.1, "delays": 1.5, "connection_type": "convergent", "weights": 0.1}]], "is3DLayer": True}
projections = {'poisson_generator_1': {'specs': {'model': 'poisson_generator', 'params': {'rate': 70000}}, 'connectees': [{'noOfNeuronTypesInLayer': {'exAndIn': 1}, 'selection': {'ll': {'y': -0.1, 'x': -0.1, 'z': -0.1}, 'ur': {'y': 0.1, 'x': 0.1, 'z': 0.1}}, 'name': ['exAndIn'], 'polarAngle': 0, 'synModel': 'static_excitatory', 'maskShape': 'box', 'azimuthAngle': 0, 'neuronType': 'All'}]},
               'spike_detector_2': {'specs': {'model': 'spike_detector', 'params': {}}, 'connectees': [{'noOfNeuronTypesInLayer': {'exAndIn': 1}, 'selection': {'ll': {'y': -0.1, 'x': -0.1, 'z': -0.1}, 'ur': {'y': 0.1, 'x': 0.1, 'z': 0.1}}, 'name': ['exAndIn'], 'synModel': 'static_excitatory', 'maskShape': 'box', 'azimuthAngle': 0, 'neuronType': 'All'}]}}
selection = {"noOfNeuronTypesInLayer": {"exAndIn": 1}, "selection": {"ll": {"y": -0.1, "x": -0.1, "z": -0.1}, "ur": {"y": 0.1, "x": 0.1, "z": 0.1}}, "name": ["exAndIn"], "polarAngle": 0, "synModel": "static_excitatory", "maskShape": "box", "azimuthAngle": 0, "neuronType": "All"}

nett_spec_json = json.dumps(nett_spec)
projections_json = json.dumps(projections)
selection_json = json.dumps(selection)


class MockSlotOutMessage(object):
    def __init__(self, *args):
        pass

    def send(self, *args):
        pass


class MockSlotInMessage(object):
    def __init__(self):
        pass

    def connect(self, *args):
        pass


class MockObserveSlot(object):
    def __init__(self, slot, message_type, client):
        pass

    def start(self):
        pass


class TestNESTInterface(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # nu.nett.slot_out_float_message = MockSlotOutMessage
        # nu.nett.slot_out_string_message = MockSlotOutMessage
        # nu.nett.slot_in_float_message = MockSlotInMessage
        # nu.nett.slot_in_string_message = MockSlotInMessage
        # nu.observe_slot = MockObserveSlot
        cls.ni = nu.NESTInterface(nett_spec_json,
                                  device_projections=projections_json,
                                  silent=True)

    def setUp(self):
        with self.ni.wait_for_client():
            self.ni.reset_kernel()
        self.ni.send_device_projections()
        with self.ni.wait_for_client():
            self.ni.make_network()

    def test_print_gids(self):
        """ NESTInterface print GIDs """
        self.ni.printGIDs(selection_json)

    def test_connect(self):
        """ NESTInterface connect all """
        self.ni.connect_all()
        num_connections = self.ni.get_num_connections()
        self.assertEqual(num_connections, 1560)

    def test_simulate(self):
        """ NESTInterface simulate """
        self.ni.connect_all()
        self.ni.simulate(150)
        # TODO: check results
