# -*- coding: utf-8 -*-
#
# test_brunel.py
#
# This file is part of the NEST Connection App.
#
# Copyright (C) 2004 The NEST Initiative
#
# NEST Connection App is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
#
# NEST Connection App is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with NEST Connection App.  If not, see <http://www.gnu.org/licenses/>.

import unittest
from matplotlib.backend_bases import MouseEvent
from ..selector import PointsSelector
from .define_brunel_for_testing import make_layers
from ..GUI.qt_gui import QtGUI
import nest

"""
Tests the Brunel example.
"""


class TestBrunel(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        nest.set_verbosity('M_WARNING')
        nest.ResetKernel()

        cls.layers, cls.models, cls.syn_models = make_layers()

        cls.models += cls.syn_models

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
            self.points_selector.get_selections(), [])

    def test_correct_gids(self):
        # input and output layers have only one GID in whole layer
        click_list = [[-4.9117, -4.9698, 4.9821, 5.0093, 'Input noise'],
                      [-4.9511, -5.0124, 4.9426, 4.9240, 'Ex. spike detector'],
                      [-4.9511, -5.0093, 5.0279, 4.9698, 'In. spike detector']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input noise'], (2,))
        self.assertEqual(src_gid_dict['Ex. spike detector'], (12506,))
        self.assertEqual(src_gid_dict['In. spike detector'], (12508,))

    def test_select_areas(self):
        click_list = [[-3.1930, 2.7491, -1.9989, 3.6873, 'Excitatory',
                       'rectangle', 'source'],
                      [-2.8317, 2.2800, -1.5524, 2.9197, 'Inhibitory',
                       'rectangle', 'target'],
                      [-3.4062, -0.5346, -2.2975, -0.0655, 'Excitatory',
                       'ellipse', 'target'],
                      [-2.0641, 1.3844, -0.4862, 2.6211, 'Inhibitory',
                       'ellipse', 'source']]

        for x_c, y_c, x_r, y_r, layer, mask_type, conn_type in click_list:
            self.points_selector.mask_type = mask_type
            self.points_selector.connection_type = conn_type
            mclick = self._make_mouse_event(x_c, y_c, layer)
            mrelease = self._make_mouse_event(x_r, y_r, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Excitatory'],
                         (1823, 1824, 1825, 1826, 1923, 1924, 1925, 1926, 2023,
                          2024, 2025, 2026, 2123, 2124, 2125, 2126, 2223, 2224,
                          2225, 2226, 2323, 2324, 2325, 2326, 2423, 2424, 2425,
                          2426, 1817, 1818, 1819, 1820, 1821, 1822, 1917, 1918,
                          1919, 1920, 1921, 1922, 2017, 2018, 2019, 2020, 2021,
                          2022, 2117, 2118, 2119, 2120, 2121, 2122, 2217, 2218,
                          2219, 2220, 2221, 2222, 2317, 2318, 2319, 2320, 2321,
                          2322, 2417, 2418, 2419, 2420, 2421, 2422, 2523, 2524,
                          2525, 2526, 2623, 2624, 2625, 2626, 2723, 2724, 2725,
                          2726, 2823, 2824, 2825, 2826, 2923, 2924, 2925, 2926,
                          2517, 2518, 2519, 2520, 2521, 2522, 2617, 2618, 2619,
                          2620, 2621, 2622, 2717, 2718, 2719, 2720, 2721, 2722,
                          2817, 2818, 2819, 2820, 2821, 2822, 2917, 2918, 2919,
                          2920, 2921, 2922))

        self.assertEqual(src_gid_dict['Inhibitory'],
                         (10768, 10769, 10770, 10771, 10818, 10819, 10820,
                          10821, 10822, 10868, 10869, 10870, 10871, 10872,
                          10918, 10919, 10920, 10921, 10922, 10968, 10969,
                          10970, 10971, 10972, 11018, 11019, 11020, 11021,
                          11022, 11068, 11069, 11070, 11071, 11119, 11120,
                          10817, 10867, 10917, 10967, 11017))

        self.assertEqual(trgt_gid_dict['Excitatory'],
                         (1656, 1657, 1755, 1756, 1757, 1758, 1855, 1856,
                          1857, 1858, 1955, 1956, 1957, 1958, 2055, 2056,
                          2057, 2058, 2155, 2156, 2157, 2158, 2255, 2256,
                          2257, 2258, 2355, 2356, 2357, 2358, 2455, 2456,
                          2457, 2458, 2555, 2556, 2557, 2558, 2656, 2657))

        self.assertEqual(trgt_gid_dict['Inhibitory'],
                         (10568, 10618, 10668, 10718, 10768, 10818, 10565,
                          10566, 10567, 10615, 10616, 10617, 10665, 10666,
                          10667, 10715, 10716, 10717, 10765, 10766, 10767,
                          10815, 10816, 10817))

    def test_spike_detector(self):
        # Test that we have spike detectors only if they are chosen
        click_list = [[-1.8008, -1.0153, 1.0939, 1.8793, 'Input noise',
                       'source', 0],
                      [-3.3825, 0.2712, -0.2734, 1.7721, 'Excitatory',
                       'target', 0],
                      [-3.1814, -0.5865, -0.6084, 1.5577, 'Inhibitory',
                       'target', 0],
                      [-1.7744, -0.5865, 1.0131, 1.3433, 'Excitatory',
                       'source', 1],
                      [-2.0732, -1.4442, 0.9286, 2.0937, 'Ex. spike detector',
                       'target', 1],
                      [-2.4309, -1.3370, -1.4660, 1.0216, 'Inhibitory',
                       'source', 2],
                      [-1.4300, -2.2514, 1.4647, 1.8226, 'In. spike detector',
                       'target', 2]]
        for xc, yc, xr, yr, layer, conn_type, proj in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()

        self.assertEqual(
            self.points_selector.interface.nest_interface.spike_detectors,
            {'Ex. spike detector': (12506,),
             'In. spike detector': (12508,)})
        self.assertEqual(
            self.points_selector.interface.nest_interface.recorders,
            [])

    def test_membrane_recorder_chosen(self):
        # Test that we have membrane potential only if that is chosen
        click_list = [[-2.5512, -1.8730, 1.6299, 2.0937, 'Input noise',
                       'source', 0],
                      [-3.3825, 1.3433, -0.8095, 3.0586, 'Excitatory',
                       'target', 0],
                      [-1.6444, -1.3433, 1.2502, 1.9802, 'Voltmeter',
                       'source', 1],
                      [-2.4176, 1.2361, -0.5951, 2.2009, 'Excitatory',
                       'target', 1]]
        for xc, yc, xr, yr, layer, conn_type, proj in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()

        nest_interface = self.points_selector.interface.nest_interface
        self.assertEqual(
            self.points_selector.interface.nest_interface.spike_detectors,
            {})
        self.assertNotEqual(nest_interface.recorders, [])

    def test_membrane_recorder_target(self):
        # Test that we have membrane potential when it is chosen as target
        click_list = [[-2.5512, -1.8730, 1.6299, 2.0937, 'Input noise',
                       'source', 0],
                      [-3.3825, 1.3433, -0.8095, 3.0586, 'Excitatory',
                       'target', 0],
                      [-2.4176, 1.2361, -0.5951, 2.2009, 'Excitatory',
                       'source', 1],
                      [-1.6444, -1.3433, 1.2502, 1.9802, 'Voltmeter',
                       'target', 1]]
        for xc, yc, xr, yr, layer, conn_type, proj in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()

        nest_interface = self.points_selector.interface.nest_interface
        self.assertNotEqual(nest_interface.recorders, [])

    def test_neuron_types(self):
        # Test that we get the right nodes when selecting specific neuron types
        click_list = [[-4.9777, 4.8058, -4.8274, 4.9951, 'Excitatory',
                       'ex'],
                      [-4.8886, 4.6220, -4.7327, 4.7779, 'Excitatory',
                       'in'],
                      [-4.7995, 4.8002, -4.6158, 4.9895, 'Excitatory',
                       'all']]
        for i, click_specs in enumerate(
                click_list):
            x_click, y_click, x_release, y_release, layer, n_type = click_specs
            self.points_selector.neuron_type = n_type
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

            src_gid_dict, trgt_gid_dict = self._find_gids()

            if i == 0:
                self.assertEqual(
                    src_gid_dict['Excitatory'], (4, 5, 104, 105,))
            elif i == 1:
                self.assertEqual(
                    src_gid_dict['Excitatory'], (4, 5, 104, 105,))
            elif i == 2:
                self.assertEqual(
                    src_gid_dict['Excitatory'], (4, 5, 104, 105, 204, 205, 304,
                                                 305,))


def suite():
    test_classes_to_run = [TestBrunel]
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
