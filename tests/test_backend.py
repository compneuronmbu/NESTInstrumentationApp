import unittest
import json
import array
import numpy
import NESTConnectionApp_server as server

server.nu.nest.sr("M_ERROR setverbosity")  # suppress info messages


class TestBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):

        with open('./static/examples/brunel_converted.json', 'r') as net_file:
            net = ""
            for line in net_file:
                net += line
        modeldict = json.loads(net)

        # This simulates the file that is sent to the backend from the frontend. I don't know how to generate this when we don't
        # use the actual app. We therefore use this json file that simulate what we would have gotten. This is not the best
        # way to solve the problem, because we will forget to update this file when updating the overal scripts and things will
        # be lost.
        with open('tests/network.json', 'r') as net_file:
            net = ""
            for line in net_file:
                net += line

        networkdict = json.loads(net)

        cls.NETWORK = { "network": modeldict, "synapses": modeldict["syn_models"], "internalProjections": modeldict["projections"], "projections": networkdict }

    def setUp(self):
        server.app.testing = True
        self.app = server.app.test_client()

    def test_redirect(self):
        """ Redirect to correct URL """
        response = self.app.get('/')
        reference = ('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN"' +
                     '>\n<title>Redirecting...</title>\n<h1>Redirecting...</' +
                     'h1>\n<p>You should be redirected automatically to targ' +
                     'et URL: <a href="/NESTConnectionApp">/NESTConnectionAp' +
                     'p</a>.  If not click the link.')
        self.assertEqual(response.data.decode(), reference)

    """
    TODO: More of the functions in the Flask app should be tested, but it
    proves difficult as self.app.post() doesn't like getting a nested
    dictionary as input parameter.

    def test_selector(self):
        import pprint as p
        data = self.NETWORK.copy()
        data["selection"] = {
            "ll": {"y": 0.47591512074044995, "x": -0.5047646707675338, "z": 0},
            "ur": {"y": 0.5117881197912375, "x": -0.47171615497534247, "z": 0}}
        form = {"first": {"name": 1}, "second": 2}
        # p.pprint(data)
        response = self.app.post('/selector', data=form)
        self.assertEqual(response.data, "Some gids")
    """

    def test_init_NESTInterface(self):
        """ Initialize NESTInterface """
        data = self.NETWORK.copy()

        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)

        for old_model, new_model in network['models'].items():
            err_msg = "Model '{}' was not created in NEST.".format(new_model)
            self.assertTrue(new_model in server.nu.nest.Models(), err_msg)

        self.assertEqual(interface.layers, {"Excitatory": (1,),
                                            "Inhibitory": (1602,)})

        for old_model, new_model, syn_specs in synapses:
            err_msg = "Model '{}' was not created in NEST.".format(new_model)
            self.assertTrue(new_model in server.nu.nest.Models(), err_msg)

    def test_make_mask(self):
        """ Make masks """
        data = self.NETWORK.copy()
        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)
        ll = [-0.50, 0.48]
        ur = [-0.47, 0.51]
        mask_type = 'rectangular'
        angle = 0.0
        centre = [0.0, 0.0]
        mask = interface.make_mask(ll, ur, mask_type, angle, centre)
        gids = server.nu.tp.SelectNodesByMask((1,), centre, mask)
        self.assertEqual(gids, (2,))  # Expect to get only one GID, the first

    def test_get_gids(self):
        """ Get GIDs """
        data = self.NETWORK.copy()
        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)
        selection = projections['poisson_generator_1']['connectees'][0]
        gids = interface.get_gids(selection)
        self.assertEqual(gids, [2,])  # Expect to get only one GID, the first

    def test_connect_internal_projections(self):
        """ Connecting internal projections """
        data = self.NETWORK.copy()
        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)
        interface.connect_internal_projections()
        num_connections = server.nu.nest.GetKernelStatus()['num_connections']
        self.assertEqual(num_connections, 447029)

    def test_connect_devices(self):
        """ Connecting to devices """
        data = self.NETWORK.copy()
        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)
        interface.connect_to_devices()
        connections = server.nu.nest.GetConnections()
        reference = (array.array('l', [2, 2003, 0, 0, 0]),
                     array.array('l', [2004, 2, 0, 0, 0]),
                     array.array('l', [2005, 2, 0, 55, 0]))
        self.assertEqual(len(connections), len(reference))

        # Not a really good test
        for count in range(len(connections)):
            self.assertEqual(numpy.sort(connections[count][:2]).all(), numpy.sort(reference[count][:2]).all())

    def test_get_device_results(self):
        """ Getting results from devices """
        data = self.NETWORK.copy()
        network = data['network']
        synapses = data['synapses']
        internal_projections = data['internalProjections']
        projections = data['projections']
        interface = server.nu.NESTInterface(network,
                                            synapses,
                                            internal_projections,
                                            projections)
        interface.connect_to_devices()
        interface.prepare_simulation()
        interface.run(10)
        interface.cleanup_simulation()

        results = interface.get_device_results()
        reference = {'stream_results': {u'voltmeter_2': {'2': [9.0, -66.0]}},
                     'plot_results': {'rec_dev':
                                      {'V_m': [[-70.0], [-69.97424701005356],
                                               [-69.787468874431553],
                                               [-69.380225377373009],
                                               [-68.790208769690452],
                                               [-68.082377066425806],
                                               [-67.307316343161943],
                                               [-66.493731900396725],
                                               [-65.673100207914402]],
                                       'times': [1.0, 2.0, 3.0, 4.0, 5.0, 6.0,
                                                 7.0, 8.0, 9.0]},
                                      'spike_det': {'senders': [],
                                                    'times': []},
                                      'time': 10.0}}
        self.assertEqual(results, reference)


def suite():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBackend)
    return suite


def run():
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite())


if __name__ == '__main__':
    run()
