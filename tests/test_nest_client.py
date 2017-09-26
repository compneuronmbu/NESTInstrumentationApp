import unittest
import nest_client as nc
import json
import nett_python as nett_orig

nett_spec = {"syn_models": [["static_synapse", "static_excitatory", {}]], "models": {"excitatory": "iaf_psc_alpha"}, "layers": [{"neurons": [{"x": -2.0, "y": -2.0, "z": -2.0}, {"x": -2.0, "y": -2.0, "z": -1.0}, {"x": -2.0, "y": -2.0, "z": 0.0}, {"x": -2.0, "y": -2.0, "z": 1.0}, {"x": -2.0, "y": -2.0, "z": 2.0}, {"x": -2.0, "y": -1.0, "z": -2.0}, {"x": -2.0, "y": -1.0, "z": -1.0}, {"x": -2.0, "y": -1.0, "z": 0.0}, {"x": -2.0, "y": -1.0, "z": 1.0}, {"x": -2.0, "y": -1.0, "z": 2.0}, {"x": -2.0, "y": 0.0, "z": -2.0}, {"x": -2.0, "y": 0.0, "z": -1.0}, {"x": -2.0, "y": 0.0, "z": 0.0}, {"x": -2.0, "y": 0.0, "z": 1.0}, {"x": -2.0, "y": 0.0, "z": 2.0}, {"x": -2.0, "y": 1.0, "z": -2.0}, {"x": -2.0, "y": 1.0, "z": -1.0}, {"x": -2.0, "y": 1.0, "z": 0.0}, {"x": -2.0, "y": 1.0, "z": 1.0}, {"x": -2.0, "y": 1.0, "z": 2.0}, {"x": -2.0, "y": 2.0, "z": -2.0}, {"x": -2.0, "y": 2.0, "z": -1.0}, {"x": -2.0, "y": 2.0, "z": 0.0}, {"x": -2.0, "y": 2.0, "z": 1.0}, {"x": -2.0, "y": 2.0, "z": 2.0}, {"x": -1.0, "y": -2.0, "z": -2.0}, {"x": -1.0, "y": -2.0, "z": -1.0}, {"x": -1.0, "y": -2.0, "z": 0.0}, {"x": -1.0, "y": -2.0, "z": 1.0}, {"x": -1.0, "y": -2.0, "z": 2.0}, {"x": -1.0, "y": -1.0, "z": -2.0}, {"x": -1.0, "y": -1.0, "z": -1.0}, {"x": -1.0, "y": -1.0, "z": 0.0}, {"x": -1.0, "y": -1.0, "z": 1.0}, {"x": -1.0, "y": -1.0, "z": 2.0}, {"x": -1.0, "y": 0.0, "z": -2.0}, {"x": -1.0, "y": 0.0, "z": -1.0}, {"x": -1.0, "y": 0.0, "z": 0.0}, {"x": -1.0, "y": 0.0, "z": 1.0}, {"x": -1.0, "y": 0.0, "z": 2.0}, {"x": -1.0, "y": 1.0, "z": -2.0}, {"x": -1.0, "y": 1.0, "z": -1.0}, {"x": -1.0, "y": 1.0, "z": 0.0}, {"x": -1.0, "y": 1.0, "z": 1.0}, {"x": -1.0, "y": 1.0, "z": 2.0}, {"x": -1.0, "y": 2.0, "z": -2.0}, {"x": -1.0, "y": 2.0, "z": -1.0}, {"x": -1.0, "y": 2.0, "z": 0.0}, {"x": -1.0, "y": 2.0, "z": 1.0}, {"x": -1.0, "y": 2.0, "z": 2.0}, {"x": 0.0, "y": -2.0, "z": -2.0}, {"x": 0.0, "y": -2.0, "z": -1.0}, {"x": 0.0, "y": -2.0, "z": 0.0}, {"x": 0.0, "y": -2.0, "z": 1.0}, {"x": 0.0, "y": -2.0, "z": 2.0}, {"x": 0.0, "y": -1.0, "z": -2.0}, {"x": 0.0, "y": -1.0, "z": -1.0}, {"x": 0.0, "y": -1.0, "z": 0.0}, {"x": 0.0, "y": -1.0, "z": 1.0}, {"x": 0.0, "y": -1.0, "z": 2.0}, {"x": 0.0, "y": 0.0, "z": -2.0}, {"x": 0.0, "y": 0.0, "z": -1.0}, {"x": 0.0, "y": 0.0, "z": 0.0}, {"x": 0.0, "y": 0.0, "z": 1.0}, {"x": 0.0, "y": 0.0, "z": 2.0}, {"x": 0.0, "y": 1.0, "z": -2.0}, {"x": 0.0, "y": 1.0, "z": -1.0}, {"x": 0.0, "y": 1.0, "z": 0.0}, {"x": 0.0, "y": 1.0, "z": 1.0}, {"x": 0.0, "y": 1.0, "z": 2.0}, {"x": 0.0, "y": 2.0, "z": -2.0}, {"x": 0.0, "y": 2.0, "z": -1.0}, {"x": 0.0, "y": 2.0, "z": 0.0}, {"x": 0.0, "y": 2.0, "z": 1.0}, {"x": 0.0, "y": 2.0, "z": 2.0}, {"x": 1.0, "y": -2.0, "z": -2.0}, {"x": 1.0, "y": -2.0, "z": -1.0}, {"x": 1.0, "y": -2.0, "z": 0.0}, {"x": 1.0, "y": -2.0, "z": 1.0}, {"x": 1.0, "y": -2.0, "z": 2.0}, {"x": 1.0, "y": -1.0, "z": -2.0}, {"x": 1.0, "y": -1.0, "z": -1.0}, {"x": 1.0, "y": -1.0, "z": 0.0}, {"x": 1.0, "y": -1.0, "z": 1.0}, {"x": 1.0, "y": -1.0, "z": 2.0}, {"x": 1.0, "y": 0.0, "z": -2.0}, {"x": 1.0, "y": 0.0, "z": -1.0}, {"x": 1.0, "y": 0.0, "z": 0.0}, {"x": 1.0, "y": 0.0, "z": 1.0}, {"x": 1.0, "y": 0.0, "z": 2.0}, {"x": 1.0, "y": 1.0, "z": -2.0}, {"x": 1.0, "y": 1.0, "z": -1.0}, {"x": 1.0, "y": 1.0, "z": 0.0}, {"x": 1.0, "y": 1.0, "z": 1.0}, {"x": 1.0, "y": 1.0, "z": 2.0}, {"x": 1.0, "y": 2.0, "z": -2.0}, {"x": 1.0, "y": 2.0, "z": -1.0}, {"x": 1.0, "y": 2.0, "z": 0.0}, {"x": 1.0, "y": 2.0, "z": 1.0}, {"x": 1.0, "y": 2.0, "z": 2.0}, {"x": 2.0, "y": -2.0, "z": -2.0}, {"x": 2.0, "y": -2.0, "z": -1.0}, {"x": 2.0, "y": -2.0, "z": 0.0}, {"x": 2.0, "y": -2.0, "z": 1.0}, {"x": 2.0, "y": -2.0, "z": 2.0}, {"x": 2.0, "y": -1.0, "z": -2.0}, {"x": 2.0, "y": -1.0, "z": -1.0}, {"x": 2.0, "y": -1.0, "z": 0.0}, {"x": 2.0, "y": -1.0, "z": 1.0}, {"x": 2.0, "y": -1.0, "z": 2.0}, {"x": 2.0, "y": 0.0, "z": -2.0}, {"x": 2.0, "y": 0.0, "z": -1.0}, {"x": 2.0, "y": 0.0, "z": 0.0}, {"x": 2.0, "y": 0.0, "z": 1.0}, {"x": 2.0, "y": 0.0, "z": 2.0}, {"x": 2.0, "y": 1.0, "z": -2.0}, {"x": 2.0, "y": 1.0, "z": -1.0}, {"x": 2.0, "y": 1.0, "z": 0.0}, {"x": 2.0, "y": 1.0, "z": 1.0}, {"x": 2.0, "y": 1.0, "z": 2.0}, {"x": 2.0, "y": 2.0, "z": -2.0}, {"x": 2.0, "y": 2.0, "z": -1.0}, {"x": 2.0, "y": 2.0, "z": 0.0}, {"x": 2.0, "y": 2.0, "z": 1.0}, {"x": 2.0, "y": 2.0, "z": 2.0}], "elements": "excitatory", "center": [0.0, 0.0, 0.0], "extent": [5.0, 5.0, 5.0], "name": "exAndIn", "neuronType": ""}], "projections": [["exAndIn", "exAndIn", {"synapse_model": "static_synapse", "kernel": 0.1, "delays": 1.5, "connection_type": "convergent", "weights": 0.1}]], "is3DLayer": True}
projections = {'poisson_generator_1': {'specs': {'model': 'poisson_generator', 'params': {'rate': 70000}}, 'connectees': [{'noOfNeuronTypesInLayer': {'exAndIn': 1}, 'selection': {'ll': {'y': -0.1, 'x': -0.1, 'z': -0.1}, 'ur': {'y': 0.1, 'x': 0.1, 'z': 0.1}}, 'name': ['exAndIn'], 'polarAngle': 0, 'synModel': 'static_excitatory', 'maskShape': 'box', 'azimuthAngle': 0, 'neuronType': 'All'}]},
               'spike_detector_2': {'specs': {'model': 'spike_detector', 'params': {}}, 'connectees': [{'noOfNeuronTypesInLayer': {'exAndIn': 1}, 'selection': {'ll': {'y': -0.1, 'x': -0.1, 'z': -0.1}, 'ur': {'y': 0.1, 'x': 0.1, 'z': 0.1}}, 'name': ['exAndIn'], 'synModel': 'static_excitatory', 'maskShape': 'box', 'azimuthAngle': 0, 'neuronType': 'All'}]}}
selection = {"noOfNeuronTypesInLayer": {"exAndIn": 1}, "selection": {"ll": {"y": -0.1, "x": -0.1, "z": -0.1}, "ur": {"y": 0.1, "x": 0.1, "z": 0.1}}, "name": ["exAndIn"], "polarAngle": 0, "synModel": "static_excitatory", "maskShape": "box", "azimuthAngle": 0, "neuronType": "All"}

nett_spec_json = json.dumps(nett_spec)
projections_json = json.dumps(projections)
selection_json = json.dumps(selection)


# Mocking things that have irrelevant and undesirable effects.
def mock_initialize(url):
    print('Mock init nett with url: {}'.format(url))


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


class TestNESTClient(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        nc.nett.initialize = mock_initialize
        nc.nett.slot_out_float_message = MockSlotOutMessage
        nc.nett.slot_out_string_message = MockSlotOutMessage
        nc.nett.slot_in_string_message = MockSlotInMessage
        nc.observe_slot = MockObserveSlot
        cls.client = nc.NESTClient(silent=True)

    def setUp(self):
        self.client.handle_reset()

    def test_make_network_specs(self):
        """ Client make network specs """
        self.client.handle_make_network_specs(nett_spec_json)

        for new_model, old_model in nett_spec['models'].items():
            self.assertTrue(new_model in nc.nest.Models())
        # Size of network: root + layer + number of neurons
        self.assertEqual(nc.nest.GetKernelStatus()['network_size'],
                         2 + len(nett_spec['layers'][0]['neurons']))
        for old_syn_model, new_syn_model, args in nett_spec['syn_models']:
            self.assertTrue(new_syn_model in nc.nest.Models())

    def test_make_mask(self):
        """ Client make Mask """
        self.client.handle_make_network_specs(nett_spec_json)
        lower_left = [-0.1, -0.1, -0.1]
        upper_right = [0.1, 0.1, 0.1]
        mask_type = 'box'
        azimuth_angle = 0.0
        polar_angle = 0.0
        cntr = [0.0, 0.0, 0.0]
        mask = self.client.make_mask(lower_left, upper_right, mask_type,
                                     azimuth_angle, polar_angle, cntr)
        gids = nc.tp.SelectNodesByMask((1,), cntr, mask)
        self.assertEqual(gids, (64,))

    def test_get_gids(self):
        """ Client get GIDs """
        self.client.handle_make_network_specs(nett_spec_json)
        gids = self.client.handle_get_gids(selection_json)
        self.assertEqual(gids, [64])

    def test_connect_with_internal_only(self):
        """ Client connect internal only """
        # Only internal network.
        self.client.handle_make_network_specs(nett_spec_json)
        self.client.handle_connect()
        self.assertEqual(nc.nest.GetKernelStatus()['num_connections'], 1558)

    def test_connect_all(self):
        """ Client connect all """
        # Internal network and two devices connected to a neuron.
        self.client.handle_make_network_specs(nett_spec_json)
        self.client.handle_recv_projections(projections_json)
        self.client.handle_connect()
        self.assertEqual(nc.nest.GetKernelStatus()['num_connections'], 1560)

    def test_simulate(self):
        """ Client simulate """
        self.client.handle_make_network_specs(nett_spec_json)
        self.client.handle_recv_projections(projections_json)
        self.client.handle_connect()
        self.client.handle_simulate(150)

        results = self.client.last_results
        self.assertDictEqual(results, {'spike_detector_2': {'64': [109.4]}})

    # TODO: Test getIndicesOfNeuronType.
