# -*- coding: utf-8 -*-
import unittest
from matplotlib.backend_bases import MouseEvent
from ..selector import PointsSelector
from .define_layers_for_testing import make_layers, np
from ..GUI.guis import QtGUI
import nest

"""
Tests here interact with NEST.
"""


class TestWithNEST(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        nest.ResetKernel()
        nest.set_verbosity('M_WARNING')
        Params = {
            'Np': int(40),
            'Ns': int(30),
            'visSize': 8.0,
            'ret_rate': 45.0,
            'ret_amplitude': 0.0,
            'temporal_frequency': 2.0,  # (Hz)
        }
        np.random.seed(12345)
        cls.layers, cls.models, cls.syn_models = make_layers(Params)

        cls.models += cls.syn_models

        cls.points_selector = PointsSelector(cls.layers, cls.models, cls.syn_models)
        cls.points_selector._plot_layers()

        cls.points_selector.set_GUI(QtGUI)
        cls.points_selector.interface.make_GUI()

    def setUp(self):
        nest.ResetKernel()
        self.points_selector.mask_type = 'rectangle'
        self.points_selector.connection_type = 'source'
        self.points_selector.interface.selector_interaction.reset()
        self.points_selector.interface.nest_interface.reset()
        nest_interface = self.points_selector.interface.nest_interface
        nest_interface.make_layers_and_models()

    def _make_mouse_event(self, x_data, y_data, layer_name):
        # Simulating a click or release of the mouse
        for ax in self.points_selector.axs_layer_dict:
            if self.points_selector.axs_layer_dict[ax]['name'] == layer_name:
                break
        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
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

    def test_connect_simple(self):
        # Connecting two rectangular areas in the same layer

        self.points_selector.mask_type = 'rectangle'
        click_list = [[-0.62, 2.47, -0.10, 2.61, 'Tp', 'source'],
                      [0.29, -2.79, 0.48, -2.54, 'Tp', 'target']]
        for xc, yc, xr, yr, layer, conn_type in click_list:
            self.points_selector.connection_type = conn_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self.assertEqual(nest.GetKernelStatus()['num_connections'], 0)
        self._connect()
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(nest.GetKernelStatus()['num_connections'], 8)

        conn_list = []
        for layer_name in src_gid_dict:
            conn_list += [list(x[:2]) for x in nest.GetConnections(
                src_gid_dict[layer_name])]
        self.assertEqual(conn_list, [[4692, 4878], [4692, 6478], [4732, 4878],
                                     [4732, 6478], [6292, 4878], [6292, 6478],
                                     [6332, 4878], [6332, 6478]])

    def test_connect_mixed_multiple(self):
        # Connecting areas of mixed type in multiple layers

        self.points_selector.mask_type = 'rectangle'
        click_list = [[-0.60, -0.11, 0.07, 0.57, 'Input Ret',
                       'source', 'ellipse'],
                      [-1.68, 2.12, -1.44, 2.32, 'Tp', 'source', 'rectangle'],
                      [0.35, -2.29, 0.67, -2.02, 'Tp', 'target', 'rectangle'],
                      [-0.32, -0.37, -0.09, -0.09, 'Rp', 'target',
                       'rectangle']]
        for xc, yc, xr, yr, layer, conn_type, mask_type in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.mask_type = mask_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(nest.GetKernelStatus()['num_connections'], 66)

        conn_list = []
        for layer_name in src_gid_dict:
            conn_list += [list(x[:2]) for x in nest.GetConnections(
                src_gid_dict[layer_name])]
        conn_list.sort()
        self.assertEqual(conn_list, [[700, 4915], [700, 6515], [700, 7946],
                                     [700, 7947], [700, 7986], [700, 7987],
                                     [701, 4915], [701, 6515], [701, 7946],
                                     [701, 7947], [701, 7986], [701, 7987],
                                     [739, 4915], [739, 6515], [739, 7946],
                                     [739, 7947], [739, 7986], [739, 7987],
                                     [740, 4915], [740, 6515], [740, 7946],
                                     [740, 7947], [740, 7986], [740, 7987],
                                     [741, 4915], [741, 6515], [741, 7946],
                                     [741, 7947], [741, 7986], [741, 7987],
                                     [742, 4915], [742, 6515], [742, 7946],
                                     [742, 7947], [742, 7986], [742, 7987],
                                     [779, 4915], [779, 6515], [779, 7946],
                                     [779, 7947], [779, 7986], [779, 7987],
                                     [780, 4915], [780, 6515], [780, 7946],
                                     [780, 7947], [780, 7986], [780, 7987],
                                     [781, 4915], [781, 6515], [781, 7946],
                                     [781, 7947], [781, 7986], [781, 7987],
                                     [4493, 4915], [4493, 6515], [4493, 7946],
                                     [4493, 7947], [4493, 7986], [4493, 7987],
                                     [6093, 4915], [6093, 6515], [6093, 7946],
                                     [6093, 7947], [6093, 7986], [6093, 7987]])

    def test_connect_projections(self):
        # Connecting two rectangular areas in the same layer

        click_list = [[-3.35, 3.28, -3.02, 3.51, 'Input Ret', 'source', 0],
                      [-3.69, 3.54, -3.50, 3.71, 'Tp', 'target', 0],
                      [-3.14, 2.66, -2.85, 2.92, 'Tp', 'source', 1],
                      [3.18, -3.66, 3.37, -3.40, 'Tp', 'target', 1]]
        for xc, yc, xr, yr, layer, conn_type, proj in click_list:
            self.points_selector.connection_type = conn_type
            self.points_selector.cprojection = (
                self.points_selector.cprojection_list[proj])
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self._connect()
        self.assertEqual(nest.GetKernelStatus()['num_connections'], 24)

        # Get all source GIDs
        src_gid_dict = {}
        src_gid_dict['Input Ret'] = []
        src_gid_dict['Tp'] = []
        for proj in self.points_selector.cprojection_list:
            self.points_selector.cprojection = proj
            temp_src_gid_dict, temp_trgt_gid_dict = self._find_gids()
            if 'Input Ret' in temp_src_gid_dict:
                src_gid_dict['Input Ret'] += temp_src_gid_dict['Input Ret']
            if 'Tp' in temp_src_gid_dict:
                src_gid_dict['Tp'] += temp_src_gid_dict['Tp']

        conn_list = []
        for layer_name in src_gid_dict:
            print("Adding", src_gid_dict[layer_name])
            conn_list += [list(x[:2]) for x in nest.GetConnections(
                src_gid_dict[layer_name])]
        print("conn_list", conn_list)

        sorted_conn_list = sorted(conn_list)
        ref_list = [[4170, 5482], [4170, 7082], [4171, 5482],
                    [4171, 7082], [5770, 5482], [5770, 7082],
                    [5771, 5482], [5771, 7082], [4210, 5482],
                    [4210, 7082], [4211, 5482], [4211, 7082],
                    [5810, 5482], [5810, 7082], [5811, 5482],
                    [5811, 7082], [124, 4086], [124, 5686],
                    [125, 4086], [125, 5686], [164, 4086],
                    [164, 5686], [165, 4086], [165, 5686]]
        sorted_ref_list = sorted(ref_list)
        self.assertEqual(sorted_conn_list, sorted_ref_list)

    def test_combined_rect_mask(self):
        # Test that two overlapping rectangular masks return correct GIDs, both
        # for source and target

        click_list = [[-3.96, 3.37, -3.39, 3.96, 'Input Ret'],
                      [-3.81, 2.74, -3.39, 3.82, 'Input Ret']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self.points_selector.connection_type = 'target'

        click_list = [[-1.41, 1.36, -0.79, 2.22, 'Input Ret'],
                      [-1.17, 1.34, -0.17, 1.78, 'Input Ret']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (2, 3, 4, 42, 43, 44, 45, 46, 47, 82, 83, 84, 85, 86,
                          87))

        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (532, 533, 534, 572, 573, 574, 612, 613, 614, 653,
                          654, 693, 694, 733, 734, 531, 571, 611))

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())

        self.assertEqual(mask_no['Input Ret'], 2)

        # Test that two overlapping rectangular masks return correct GIDs when
        # one is source and one is target
        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
        self.points_selector.interface._reset_button_on_clicked(m_event)

        click_list = [-1.90, 1.98, -1.11, 2.78, 'Tp']
        mclick = self._make_mouse_event(click_list[0], click_list[1],
                                        click_list[4])
        mrelease = self._make_mouse_event(click_list[2], click_list[3],
                                          click_list[4])
        self.points_selector.store_selection(mclick, mrelease)

        self.points_selector.connection_type = 'target'

        click_list = [-1.90, 1.98, -1.11, 2.78, 'Tp']
        mclick = self._make_mouse_event(click_list[0], click_list[1],
                                        click_list[4])
        mrelease = self._make_mouse_event(click_list[2], click_list[3],
                                          click_list[4])
        self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Tp'],
                         (4411, 4412, 4413, 4414, 4451, 4452, 4453, 4454, 4491,
                          4492, 4493, 4494, 4531, 4532, 4533, 4534, 6011, 6012,
                          6013, 6014, 6051, 6052, 6053, 6054, 6091, 6092, 6093,
                          6094, 6131, 6132, 6133, 6134))

        self.assertEqual(trgt_gid_dict['Tp'],
                         (4411, 4412, 4413, 4414, 4451, 4452, 4453, 4454, 4491,
                          4492, 4493, 4494, 4531, 4532, 4533, 4534, 6011, 6012,
                          6013, 6014, 6051, 6052, 6053, 6054, 6091, 6092, 6093,
                          6094, 6131, 6132, 6133, 6134))

        self.assertEqual(src_gid_dict['Tp'], trgt_gid_dict['Tp'])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Tp'], 2)

    def test_both_overlap_and_single_rec_masks(self):
        # Test that you can have both overlap and non-overlapping areas
        click_list = [[-3.09, 2.41, -2.44, 3.13, 'Input Ret'],
                      [-2.81, 2.41, -1.29, 2.79, 'Input Ret'],
                      [-1.82, 0.66, -1.38, 1.62, 'Input Ret'],
                      [1.64, -1.40, 2.48, -0.65, 'Input Ret'],
                      [1.83, -2.83, 2.13, -0.80, 'Input Ret']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (206, 207, 208, 209, 246, 247, 248, 249, 286, 287,
                          288, 289, 328, 329, 368, 369, 408, 409, 448, 449,
                          488, 489, 528, 529, 454, 455, 456, 457, 458, 494,
                          495, 496, 497, 498, 1192, 1193, 1194, 1195, 1232,
                          1233, 1234, 1235, 1145, 1146, 1147, 1148, 1185, 1186,
                          1187, 1188, 1189, 1190, 1191, 1225, 1226, 1227, 1228,
                          1229, 1230, 1231, 1265, 1266, 1267, 1268))

        sorted_gid_list = sorted(src_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Input Ret'], 3)

        # Overlap, overlap, single, overlap
        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
        self.points_selector.interface._reset_button_on_clicked(m_event)

        click_list = [[-1.6413, 1.5714, -0.9778, 2.2000,
                       'Input Ret', 'source'],
                      [-1.1873, 1.3794, -0.6286, 1.9730,
                       'Input Ret', 'source'],
                      [-2.3571, 0.2095, -1.7984, 0.8032,
                       'Input Ret', 'source'],
                      [0.8206, 0.0175, 1.3794, 0.5413,
                       'Input Ret', 'target'],
                      [-0.7857, 1.1698, -0.2095, 1.7984,
                       'Input Ret', 'source'],
                      [1.2397, -0.1746, 1.7984, 0.3667,
                       'Input Ret', 'target'],
                      [-0.1921, -1.2222, 0.4016, -0.5937,
                       'Input Ret', 'target']]

        # Overlapping masks: m1+m2+m5 (source), m4+m6 (target)
        # Single masks: m3 (source), m7 (target)

        for xc, yc, xr, yr, layer, conn_type in click_list:
            self.points_selector.connection_type = conn_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (338, 339, 340, 378, 379, 380, 418, 419, 420, 492,
                          493, 532, 533, 572, 573, 574, 612, 613, 614, 652,
                          653, 654, 655, 693, 694, 695, 733, 734, 735, 491,
                          531, 571))

        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (1062, 1102, 1142, 979, 980, 981, 1019, 1020, 1021,
                          1059, 1060, 1061, 1100, 1101, 1140, 1141, 785, 786,
                          787, 825, 826, 827, 865, 866, 867))

        sorted_gid_list = sorted(src_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        sorted_gid_list = sorted(trgt_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Input Ret'], 4)

        # Overlap, overlap, single, overlap, all overlap
        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
        self.points_selector.interface._reset_button_on_clicked(m_event)

        click_list = [[-2.2349, 2.1651, -1.3968, 3.0206, 'Input Ret'],
                      [-1.5889, 2.1825, -0.8206, 2.9508, 'Input Ret'],
                      [-2.1651, 1.3794, -1.3968, 2.1825, 'Input Ret'],
                      [-0.9603, 2.2000, -0.1571, 2.9508, 'Input Ret'],
                      [-1.5714, 1.7984, -0.8032, 2.5841, 'Input Ret']]

        for xc, yc, xr, yr, layer in click_list:
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (372, 373, 374, 412, 413, 414, 452, 453, 454, 492,
                          493, 494, 532, 572, 612, 367, 368, 369, 370, 371,
                          407, 408, 409, 410, 411, 447, 448, 449, 450, 451,
                          487, 488, 489, 490, 491, 527, 528, 529, 530, 531,
                          567, 568, 569, 570, 571, 607, 608, 609, 610, 611,
                          647, 648, 649, 650, 687, 688, 689, 690, 727, 728,
                          729, 730))

        sorted_gid_list = sorted(src_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Input Ret'], 1)

    def test_multiple_overlapping_rect_masks(self):
        # Test that you can have multiple overlapping rectangular areas
        click_list = [[-2.67, 1.91, -1.37, 3.03, 'RetParrot'],
                      [-2.61, 1.61, -1.72, 2.20, 'RetParrot'],
                      [-0.06, 1.43, 1.01, 2.50, 'RetParrot'],
                      [0.35, -0.53, 0.71, 2.08, 'RetParrot'],
                      [-0.88, 2.07, 0.13, 2.84, 'Rs'],
                      [-0.65, 1.71, 0.19, 2.49, 'Rs']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['RetParrot'],
                         (2694, 2695, 2734, 2735, 2774, 2775, 2814, 2815, 2689,
                          2690, 2691, 2692, 2693, 2729, 2730, 2731, 2732, 2733,
                          2769, 2770, 2771, 2772, 2773, 2809, 2810, 2811, 2812,
                          2813, 2849, 2850, 2851, 2852, 2853, 2889, 2890, 2891,
                          2892, 2893, 3304, 3305, 3306, 3344, 3345, 3346, 3214,
                          3215, 3216, 3254, 3255, 3256, 3294, 3295, 3296, 3297,
                          3298, 3299, 3300, 3301, 3302, 3303, 3334, 3335, 3336,
                          3337, 3338, 3339, 3340, 3341, 3342, 3343, 3374, 3375,
                          3376, 3211, 3212, 3213, 3251, 3252, 3253, 3291, 3292,
                          3293, 3331, 3332, 3333, 3371, 3372, 3373))

        self.assertEqual(src_gid_dict['Rs'],
                         (39808, 39838, 39774, 39775, 39776, 39804, 39805,
                          39806, 39807, 39834, 39835, 39836, 39837, 39868,
                          39866, 39867))

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['RetParrot'], 2)
        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Rs'], 1)

    def test_overlapping_rect_ellipse(self):
        # Rect - ellipse - rect, single rect, single ellipse,
        # ellipse - rect - ellipse

        click_list = [[-2.2070, 1.9728, -1.3711, 2.6229,
                       'Input Ret', 'rectangle'],
                      [-1.5967, 1.5615, -1.1721, 2.2116,
                       'Input Ret', 'ellipse'],
                      [-1.5303, 1.5748, -0.7874, 2.0126,
                       'Input Ret', 'rectangle'],
                      [-0.0179, -1.2113, 0.5924, -0.6010,
                       'Input Ret', 'rectangle'],
                      [2.6090, 2.5831, 2.8876, 3.4189,
                       'Input Ret', 'ellipse'],
                      [-3.7990, -2.9227, -3.2153, -2.3390,
                       'Input Ret', 'ellipse'],
                      [-3.5735, -3.0421, -2.8172, -2.6043,
                          'Input Ret', 'rectangle'],
                      [-2.9897, -3.0819, -2.4723, -2.7900,
                       'Input Ret', 'ellipse']]

        for xc, yc, xr, yr, layer, mask_type in click_list:
            self.points_selector.mask_type = mask_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (492, 493, 532, 533, 572, 573, 612, 613, 369, 370,
                          371, 409, 410, 411, 449, 450, 451, 489, 490, 491,
                          531, 825, 826, 827, 865, 866, 867, 905, 906, 907,
                          1325, 1326, 1327, 1328, 74, 75, 114, 115, 116,
                          154, 155, 156, 195, 196, 235, 236, 276, 316))

        sorted_gid_list = sorted(src_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Input Ret'], 4)

        # Source, target
        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
        self.points_selector.interface._reset_button_on_clicked(m_event)

        cl = [[-3.7779, 3.2105, -3.1916, 3.8194,
               'Input Ret', 'source', 'rectangle'],
              [-3.3720, 3.0865, -2.5715, 3.3909,
               'Input Ret', 'source', 'ellipse'],
              [-0.5950, 2.5648, -0.1911, 3.2085,
                  'Input Ret', 'target', 'rectangle'],
              [-0.4057, 2.4007, 0.3516, 2.9813,
               'Input Ret', 'target', 'ellipse']]

        for xc, yc, xr, yr, layer, conn_type, mask_type in cl:
            self.points_selector.connection_type = conn_type
            self.points_selector.mask_type = mask_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (43, 44, 45, 83, 84, 85, 123, 124, 125, 165, 166, 205,
                          206, 245))

        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (686, 687, 688, 726, 727, 728, 729, 767, 768, 769,
                          807, 808, 809, 848))

        sorted_gid_list = sorted(src_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        sorted_gid_list = sorted(trgt_gid_dict['Input Ret'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])

        mask_no = (
            self.points_selector.interface.nest_interface.get_mask_number())
        self.assertEqual(mask_no['Input Ret'], 2)

    def test_unique_GIDs_when_overlapping_mask(self):
        # Test that every GID is unique when we have overlapping masks
        click_list = [[-2.68, 1.13, -0.72, 2.55, 'Ts'],
                      [-2.09, 0.83, -0.48, 2.26, 'Ts']]

        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        sorted_gid_list = sorted(src_gid_dict['Ts'])
        for i in range(len(sorted_gid_list) - 1):
            self.assertNotEqual(sorted_gid_list[i], sorted_gid_list[i + 1])


def suite():
    test_classes_to_run = [TestWithNEST]
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
