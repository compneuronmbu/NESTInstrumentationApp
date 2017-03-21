# -*- coding: utf-8 -*-
import unittest
from matplotlib.backend_bases import MouseEvent
from ..selector import PointsSelector
from ..examples.define_brunel import make_layers, make_connections
from ..GUI.qt_gui import QtGUI
import nest

"""
Easy simulations test using Brunel example
"""


class TestSimulate(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        nest.set_verbosity('M_WARNING')
        nest.ResetKernel()

        cls.layers, cls.models, cls.syn_models = make_layers()

        cls.models += cls.syn_models

        cls.connections = make_connections()

        cls.points_selector = PointsSelector(cls.layers, cls.models, cls.syn_models)
        cls.points_selector._plot_layers()

        cls.points_selector.set_GUI(QtGUI)
        cls.points_selector.interface.make_GUI()

    def setUp(self):
        nest.ResetKernel()
        self.points_selector.mask_type = 'rectangle'
        self.points_selector.connection_type = 'source'
        self.points_selector.cprojection = 'projection 1'
        self.points_selector.neuron_type = 'all'
        self.points_selector.interface.selector_interaction.reset()
        self.points_selector.interface.nest_interface.reset()
        nest_interface = self.points_selector.interface.nest_interface
        nest_interface.make_layers_and_models()

    def _make_mouse_event(self, x_data, y_data, layer_name):
        # Simulating a click or release of the mouse
        for ax in self.points_selector.axs_layer_dict:
            if self.points_selector.axs_layer_dict[ax]['name'] == layer_name:
                break
        m_event = MouseEvent('mouse_event', self.points_selector.fig.canvas,
                             0, 0, button=1)
        m_event.xdata = x_data
        m_event.ydata = y_data
        m_event.inaxes = ax
        return m_event

    def _find_gids(self):
        return(self.points_selector.interface.nest_interface.find_gids(
            self.points_selector.get_selections(),
            self.points_selector.cprojection))

    def _connect(self):
        self.points_selector.interface.nest_interface.connect(
            self.points_selector.get_selections(), self.connections)

    def test_simulate(self):
    # Simulation test with spike detector and voltmeter

        click_list = [[-0.0373, -0.0538, 0.0699, 0.0534, 'PoissonGenerator', 'source', 0],
                      [-0.1975, 0.0990, -0.1263, 0.1459, 'Excitatory', 'target', 0],
                      [-0.1740, 0.0782, -0.1280, 0.1728, 'Excitatory', 'source', 1],
                      [-0.0911, -0.0795, 0.0888, 0.0576, 'SpikeDetector', 'target', 1],
                      [-0.0697, -0.1007, 0.0803, 0.1093, 'Voltmeter_A', 'source', 2],
                      [-0.2244, 0.0556, -0.1072, 0.1980, 'Excitatory', 'target', 2],
                      [-0.0218, -0.0267, 0.0308, 0.0259, 'Voltmeter_B', 'source', 3],
                      [-0.2370, 0.1075, -0.0138, 0.2945, 'Inhibitory', 'target', 3]]


        for xc, yc, xr, yr, layer, conn_type, proj in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()
        self.points_selector.interface.nest_interface.simulate()
        sd = self.points_selector.interface.nest_interface.spike_detectors
        n_spikes = nest.GetStatus(sd['SpikeDetector'])[0]['n_events']
        self.assertEqual(n_spikes, 174)

        rec = self.points_selector.interface.nest_interface.recorders
        self.assertEqual(len(rec), 2)

   
def suite():
    test_classes_to_run = [TestSimulate]
    loader = unittest.TestLoader()
    suites_list = []
    for test_class in test_classes_to_run:
        test_suite = loader.loadTestsFromTestCase(test_class)
        suites_list.append(test_suite)

    return unittest.TestSuite(suites_list)


def run():
    runner = unittest.TextTestRunner(verbosity=2, buffer=True)
    runner.run(suite())


if __name__ == '__main__':
    run()
