# -*- coding: utf-8 -*-
#
# test_neuron_type.py
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
from ..examples.define_hill_tononi import make_layers
from ..GUI.qt_gui import QtGUI
import nest

"""
Test that choosing neuron type for Hill-Tononi example works as expected.
"""


class TestNeuronType(unittest.TestCase):

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

    def test_neuron_type(self):
        # Test that we get correct GIDs when special neurontype is chosen

        click_list = [[-3.9550, 3.6118, -3.8271, 3.9635, 'Vp_h', 'all', 0],
                      [-3.9550, 3.6118, -3.8271, 3.9635, 'Vp_h', 'L23pyr', 1],
                      [-3.9550, 3.6118, -3.8271, 3.9635, 'Vp_h', 'L23in', 2],
                      [-3.9550, 3.6118, -3.8271, 3.9635, 'Vp_h', 'L4pyr', 3],
                      [-3.9550, 3.6118, -3.8271, 3.9635, 'Vp_h', 'L4in', 4],]

        compare_list = [(4808, 4809, 6408, 6409, 8008, 8009, 9608, 9609, 11208,
                         11209, 12808, 12809, 14408, 14409, 16008, 16009,
                         17608, 17609),
                        (4808, 4809, 6408, 6409),
                        (8008, 8009),
                        (9608, 9609, 11208, 11209),
                        (12808, 12809)]

        for xc, yc, xr, yr, layer, neuron_type, proj in click_list:
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            self.points_selector.neuron_type = neuron_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

            src_gids, trgt_gids = self._find_gids()
            self.assertEqual(src_gids['Vp_h'], compare_list[proj])

    def test_no_gids_if_wrong_type(self):
        # Test that we get no GIDs if we choose a type that is not in layer

        click_list = [[-3.9625, 3.3677, -3.6992, 3.9444, 'Tp', 'all', 0],
                      [-3.9625, 3.3677, -3.6992, 3.9444, 'Tp', 'L4in', 1]]


        compare_list = [(6, 7, 8, 46, 47, 48, 1606, 1607, 1608, 1646, 1647,
                         1648),
                        {}]

        for xc, yc, xr, yr, layer, neuron_type, proj in click_list:
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            self.points_selector.neuron_type = neuron_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

            src_gids, trgt_gids = self._find_gids()
            if proj == 0:
                self.assertEqual(src_gids['Tp'], compare_list[proj])
            else:
                self.assertEqual(src_gids, compare_list[proj])

    def test_empty_selection_if_wrong_neuron_type(self):
        # Test that we have empty selection if we choose a type that is not in
        # layer

        cl = [-3.9625, 3.3677, -3.6992, 3.9444, 'Tp', 'L4in']

        self.points_selector.neuron_type = cl[5]
        mclick = self._make_mouse_event(cl[0], cl[1], cl[4])
        mrelease = self._make_mouse_event(cl[2], cl[3], cl[4])
        self.points_selector.store_selection(mclick, mrelease)
        ax = mrelease.inaxes

        sel = self.points_selector.axs_layer_dict[ax]['selected'][self.points_selector.cprojection]
        self.assertEqual(sel, [])

    def test_masks(self):
        # Test that we get correct number of masks if diffenent neurontypes are
        # chosen.

        click_list = [[-3.9625, 3.3677, -3.6992, 3.9444, 'Tp', 'all'],
                      [-3.9625, 3.3677, -3.6992, 3.9444, 'Tp', 'Relay']]

        for xc, yc, xr, yr, layer, neuron_type in click_list:
            self.points_selector.neuron_type = neuron_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gids, trgt_gids = self._find_gids()
        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Tp'], 2)
    

def suite():
    test_classes_to_run = [TestNeuronType]
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
