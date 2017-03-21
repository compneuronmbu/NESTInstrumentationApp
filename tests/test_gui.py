# -*- coding: utf-8 -*-
import unittest
from matplotlib.backend_bases import MouseEvent
from ..selector import PointsSelector, RectangleSelector, EllipseSelector
from .define_layers_for_testing import make_layers, np
from ..GUI.qt_gui import QtGUI
import nest

"""
These tests test the GUI and that the NEST Connection App functions work
properly.
"""


class TestGUI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        nest.set_verbosity('M_WARNING')
        Params = {
            'Np': 40,
            'Ns': 30,
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
        self.points_selector.mask_type = 'rectangle'
        self.points_selector.connection_type = 'source'
        self.points_selector.interface.selector_interaction.reset()

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

    def test_reset_button(self):
        # Reset button resets everything
        click_list = [[-0.26, -0.03, 0.09, 0.51, 'Input Ret'],
                      [-0.64, -0.12, -0.0, 0.42, 'Tp'],
                      [-0.49, -3.69, 1.02, -3.21, 'Vs_v']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)
        interface = self.points_selector.interface
        interface.selector_interaction.change_mask_type('target')
        self.assertEqual(self.points_selector.connection_type, 'target')

        interface.selector_interaction.reset()
        src_gid_dict, trgt_gid_dict = self._find_gids()
        self.assertEqual(src_gid_dict, {})
        self.assertEqual(trgt_gid_dict, {})
        self.assertEqual(self.points_selector.connection_type, 'source')

    def test_choose_mask_shape(self):
        # Switching the mask shape
        interface = self.points_selector.interface
        for label, selector_type in zip(['rectangle', 'ellipse'],
                                        [RectangleSelector,
                                         EllipseSelector]):
            interface.selector_interaction.change_mask_shape(label)
            self.assertEqual(self.points_selector.mask_type, label)
            for selector in self.points_selector.subplot_selector_objects:
                self.assertTrue(type(selector) is selector_type)

    def test_rect_select_first(self):
        # Selecting a small area with a rectangle finds the correct GID
        mclick = self._make_mouse_event(-4.1, 3.8, 'Input Ret')
        mrelease = self._make_mouse_event(-3.8, 4.1, 'Input Ret')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {'Input Ret': (2,)})

    def test_rect_select_square(self):
        # Selecting a larger area with a rectangle finds the correct GIDs
        mclick = self._make_mouse_event(-4.1, 3.07, 'Input Ret')
        mrelease = self._make_mouse_event(-3.0, 4.1, 'Input Ret')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {
            'Input Ret': (2, 3, 4, 5, 6, 42, 43, 44, 45, 46,
                          82, 83, 84, 85, 86, 122, 123, 124,
                          125, 126, 162, 163, 164, 165, 166)
        })

    def test_rect_select_random(self):
        # Selecting a rectangular area in a randomly distributed layer finds
        # the correct GIDs
        mclick = self._make_mouse_event(-1.20, 0.13, 'Rndm')
        mrelease = self._make_mouse_event(0.74, 1.79, 'Rndm')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {'Rndm': (1620, 1639, 1710, 1758, 1787,
                                                 1791, 1800, 1802, 1840, 1912,
                                                 1921, 2003, 2012, 2015, 2040,
                                                 2065, 2085, 2148, 2305, 2399,
                                                 1605, 1709, 1798, 1838, 1854,
                                                 1869, 1905, 1944, 1985, 2059,
                                                 2076, 2112, 2152, 2173, 2228,
                                                 2285, 2295, 2308)
                                        })

    def test_rect_select_multiple_masks(self):
        # Selecting multiple rectangles in the same layer finds the correct
        # GIDs
        click_list = [[-3.38, 2.80, -2.65, 3.54, 'Input Ret'],
                      [0.19, 1.70, 0.92, 2.90, 'Input Ret'],
                      [-1.09, -2.15, 0.01, -1.05, 'Input Ret']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (124, 125, 126, 127, 164, 165, 166, 167, 204, 205,
                          206, 207, 244, 245, 246, 247, 852, 892, 932, 972,
                          848, 849, 850, 851, 888, 889, 890, 891, 928, 929,
                          930, 931, 968, 969, 970, 971, 632, 672, 712, 752,
                          792, 627, 628, 629, 630, 631, 667, 668, 669, 670,
                          671, 707, 708, 709, 710, 711, 747, 748, 749, 750,
                          751, 787, 788, 789, 790, 791))

    def test_rect_select_multiple_layers(self):
        # Selecting rectangles from multiple layers finds the correct GIDs
        click_list = [[-0.26, -0.03, 0.09, 0.51, 'Input Ret'],
                      [-0.64, -0.12, -0.0, 0.42, 'Tp'],
                      [-0.49, -3.69, 1.02, -3.21, 'Vs_v']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Tp'],
                         (4705, 4745, 4785, 6305, 6345, 6385, 4703, 4704,
                          4743, 4744, 4783, 4784, 6303, 6304, 6343, 6344,
                          6383, 6384))
        self.assertEqual(src_gid_dict['Input Ret'], (779, 780, 781))
        self.assertEqual(src_gid_dict['Vs_v'],
                         (56931, 56961, 57831, 57861, 58731, 58761, 59631,
                          59661, 60531, 60561, 61431, 61461, 62331, 62361,
                          63231, 63261, 64131, 64161, 56930, 56960, 57830,
                          57860, 58730, 58760, 59630, 59660, 60530, 60560,
                          61430, 61460, 62330, 62360, 63230, 63260, 64130,
                          64160, 56991, 57021, 57891, 57921, 58791, 58821,
                          59691, 59721, 60591, 60621, 61491, 61521, 62391,
                          62421, 63291, 63321, 64191, 64221, 57051, 57081,
                          57951, 57981, 58851, 58881, 59751, 59781, 60651,
                          60681, 61551, 61581, 62451, 62481, 63351, 63381,
                          64251, 64281, 56990, 57020, 57890, 57920, 58790,
                          58820, 59690, 59720, 60590, 60620, 61490, 61520,
                          62390, 62420, 63290, 63320, 64190, 64220, 57050,
                          57080, 57950, 57980, 58850, 58880, 59750, 59780,
                          60650, 60680, 61550, 61580, 62450, 62480, 63350,
                          63380, 64250, 64280))

    def test_ellipse_select_first(self):
        # Selecting a small area with an ellipse finds the correct GID
        self.points_selector.mask_type = 'ellipse'
        mclick = self._make_mouse_event(-4.03, 3.74, 'Input Ret')
        mrelease = self._make_mouse_event(-3.74, 3.98, 'Input Ret')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()
        self.assertEqual(src_gid_dict, {'Input Ret': (2,)})

    def test_ellipse_select_only_second(self):
        # Selecting a small area with an ellipse finds the correct GID.
        # Using a rectangular mask here would select multiple GIDs.
        self.points_selector.mask_type = 'ellipse'
        mclick = self._make_mouse_event(-3.93, 3.51, 'Input Ret')
        mrelease = self._make_mouse_event(-3.74, 3.92, 'Input Ret')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {'Input Ret': (3,)})

    def test_ellipse_select_random(self):
        # Selecting an area in a randomly distributed layer with an ellipse
        # finds the correct GIDs
        self.points_selector.mask_type = 'ellipse'
        mclick = self._make_mouse_event(-1.94, 0.14, 'Rndm')
        mrelease = self._make_mouse_event(1.73, 1.61, 'Rndm')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {'Rndm': (1610, 1620, 1673, 1676, 1710,
                                                 1758, 1787, 1791, 1800, 1802,
                                                 1840, 1884, 1912, 1921, 2000,
                                                 2003, 2012, 2015, 2040, 2065,
                                                 2085, 2148, 2240, 2305, 2399,
                                                 1605, 1657, 1685, 1709, 1717,
                                                 1785, 1798, 1838, 1854, 1869,
                                                 1905, 1906, 1922, 1944, 2076,
                                                 2082, 2112, 2152, 2173, 2228,
                                                 2241, 2245, 2285, 2295, 2308,
                                                 2353)
                                        })

    def test_ellipse_select_multiple_masks(self):
        # Selecting multiple areas with an ellipse finds the correct GIDs
        self.points_selector.mask_type = 'ellipse'
        click_list = [[-3.48, 2.44, -1.92, 3.35, 'Input Ret'],
                      [1.20, -1.78, 2.85, -0.95, 'Input Ret'],
                      [-2.28, 0.05, -1.37, 0.42, 'Input Ret']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (126, 127, 128, 166, 167, 168, 205, 206, 207, 208,
                          209, 245, 246, 247, 248, 249, 285, 286, 287, 288,
                          289, 326, 327, 328, 366, 367, 368, 1068, 1069, 1107,
                          1108, 1109, 1147, 1148, 1149, 1150, 1187, 1188, 1189,
                          1190, 1227, 1228, 1229, 1230, 1267, 1268, 1269, 1270,
                          1307, 1308, 1309, 1310, 1348, 1349, 380, 381, 420,
                          421, 460, 461, 500))

    def test_ellipse_select_multiple_layers(self):
        # Selecting areas in multiple layers with and ellipse finds the correct
        # GIDs
        self.points_selector.mask_type = 'ellipse'
        click_list = [[-1.00, 1.80, 0.65, 3.08, 'Input Ret'],
                      [-1.99, -3.06, -0.80, 2.16, 'RetParrot'],
                      [-0.73, -3.23, 2.67, -1.67, 'Rp']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['RetParrot'],
                         (2874, 2875, 2876, 2914, 2915, 2916, 2917, 2918, 2954,
                          2955, 2956, 2957, 2958, 2994, 2995, 2996, 2997, 2824,
                          2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2864,
                          2865, 2866, 2867, 2868, 2869, 2870, 2871, 2872, 2873,
                          2904, 2905, 2906, 2907, 2908, 2909, 2910, 2911, 2912,
                          2913, 2944, 2945, 2946, 2947, 2948, 2949, 2950, 2951,
                          2952, 2953, 2984, 2985, 2986, 2987, 2988, 2989, 2990,
                          2991, 2992, 2993, 3024, 3025, 3026, 3027, 3028, 3029,
                          3030, 3031, 3032, 2819, 2820, 2821, 2822, 2823, 2855,
                          2856, 2857, 2858, 2859, 2860, 2861, 2862, 2863, 2894,
                          2895, 2896, 2897, 2898, 2899, 2900, 2901, 2902, 2903,
                          2934, 2935, 2936, 2937, 2938, 2939, 2940, 2941, 2942,
                          2943, 2975, 2976, 2977, 2978, 2979, 2980, 2981, 2982,
                          2983, 3019, 3020, 3021, 3022, 3023, 2893, 2933)

                         )
        self.assertEqual(src_gid_dict['Rp'],
                         (7878, 7916, 7917, 7918, 7919, 7956, 7957, 7958, 7959,
                          7960, 7996, 7997, 7998, 7999, 8000, 7995, 8036, 8037,
                          8038, 8039, 8040, 8041, 8076, 8077, 8078, 8079, 8080,
                          8081, 8116, 8117, 8118, 8119, 8120, 8121, 8156, 8157,
                          8158, 8159, 8160, 8161, 8196, 8197, 8198, 8199, 8200,
                          8201, 8236, 8237, 8238, 8239, 8240, 8241, 8276, 8277,
                          8278, 8279, 8280, 8281, 8316, 8317, 8318, 8319, 8320,
                          8321, 8356, 8357, 8358, 8359, 8360, 8361, 8396, 8397,
                          8398, 8399, 8400, 8401, 8436, 8437, 8438, 8439, 8440,
                          8476, 8477, 8478, 8479, 8480, 8517, 8518, 8519, 8035,
                          8075, 8115, 8154, 8155, 8194, 8195, 8234, 8235, 8274,
                          8275, 8315, 8355, 8395, 8435)
                         )
        self.assertEqual(src_gid_dict['Input Ret'],
                         (692, 732, 772, 608, 609, 610, 647, 648, 649, 650,
                          651, 687, 688, 689, 690, 691, 727, 728, 729, 730,
                          731, 767, 768, 769, 770, 771, 812, 807, 808, 809,
                          810, 811, 847, 848, 849, 850, 851, 888, 889, 890,
                          891))

    def test_choose_source_target(self):
        # Switching between source and target selection
        self.assertEqual(self.points_selector.connection_type, 'source')

        interface = self.points_selector.interface
        interface._source_target_button_on_clicked('target')
        self.assertEqual(self.points_selector.connection_type, 'target')

        interface._source_target_button_on_clicked('source')
        self.assertEqual(self.points_selector.connection_type, 'source')

    def test_target(self):
        # Target GID dictionary empty if no target chosen
        mclick = self._make_mouse_event(-4.1, 3.8, 'Input Ret')
        mrelease = self._make_mouse_event(-3.8, 4.1, 'Input Ret')

        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {'Input Ret': (2,)})
        self.assertEqual(trgt_gid_dict, {})

        self.points_selector.interface._reset_button_on_clicked(mclick)

        # Target dictionary containing correct GID if target type chosen
        self.points_selector.connection_type = 'target'
        self.points_selector.store_selection(mclick, mrelease)
        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict, {})
        self.assertEqual(trgt_gid_dict, {'Input Ret': (2,)})

    def test_source_target(self):
        # Both source and target dictionaries have correct values when both
        # used
        click_list = [[-2.13, 2.17, -1.42, 2.53, 'Input Ret'],
                      [1.99, -0.34, 2.39, 0.11, 'Tp'],
                      [-1.30, 0.38, -1.14, 1.59, 'Vp_h']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self.points_selector.connection_type = 'target'

        click_list = [[1.77, -0.34, 2.17, 0.34, 'Input Ret'],
                      [-2.60, -2.66, -1.97, -2.43, 'Vs_c']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        self.points_selector.connection_type = 'source'

        click_list = [[-1.13, -1.48, -0.56, -1.03, 'Input Ret']]
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (369, 370, 409, 410, 449, 450, 489, 490, 587, 588,
                          627, 628, 667, 668))
        self.assertEqual(src_gid_dict['Tp'],
                         (5225, 5226, 5265, 5266, 6825, 6826, 6865, 6866, 5224,
                          5264, 6824, 6864))
        self.assertEqual(src_gid_dict['Vp_h'],
                         (9342, 9343, 9344, 10942, 10943, 10944, 12542, 12543,
                          12544, 14142, 14143, 14144, 15742, 15743, 15744,
                          17342, 17343, 17344, 18942, 18943, 18944, 20542,
                          20543, 20544, 22142, 22143, 22144, 9340, 9341, 10940,
                          10941, 12540, 12541, 14140, 14141, 15740, 15741,
                          17340, 17341, 18940, 18941, 20540, 20541, 22140,
                          22141, 9339, 10939, 12539, 14139, 15739, 17339,
                          18939, 20539, 22139))

        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (1182, 1183, 1222, 1223, 1180, 1181, 1220, 1221))
        self.assertEqual(trgt_gid_dict['Vs_c'],
                         (48586, 48616, 49486, 49516, 50386, 50416, 51286,
                          51316, 52186, 52216, 53086, 53116, 53986, 54016,
                          54886, 54916, 55786, 55816, 48646, 49546, 50446,
                          51346, 52246, 53146, 54046, 54946, 55846))

    def test_target_with_ellipse(self):
        # Target option works with ellipse
        self.points_selector.mask_type = 'ellipse'

        click_list = [-1.60, 1.73, -0.79, 2.17, 'Input Ret']

        mclick = self._make_mouse_event(click_list[0], click_list[1],
                                        click_list[4])
        mrelease = self._make_mouse_event(click_list[2], click_list[3],
                                          click_list[4])
        self.points_selector.store_selection(mclick, mrelease)

        self.points_selector.connection_type = 'target'

        click_list = [-0.97, 1.12, -0.08, 1.57, 'Rs']
        mclick = self._make_mouse_event(click_list[0], click_list[1],
                                        click_list[4])
        mrelease = self._make_mouse_event(click_list[2], click_list[3],
                                          click_list[4])
        self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (492, 532, 572, 612, 531, 571, 611))
        self.assertEqual(trgt_gid_dict['Rs'], (39779, 39780, 39809, 39810))

    def test_mixed_select_multiple_masks(self):
        # Using both rectangle and ellipse to select in the same layer gives
        # the correct GIDs

        # first with rectangle
        x_click, y_click, x_release, y_release, layer = [
            -3.11, 2.53, -2.19, 3.45, 'Input Ret']
        mclick = self._make_mouse_event(x_click, y_click, layer)
        mrelease = self._make_mouse_event(x_release, y_release, layer)
        self.points_selector.store_selection(mclick, mrelease)

        # then with ellipse
        self.points_selector.mask_type = 'ellipse'
        x_click, y_click, x_release, y_release, layer = [
            0.28, 0.05, 2.02, 0.97, 'Input Ret']
        mclick = self._make_mouse_event(x_click, y_click, layer)
        mrelease = self._make_mouse_event(x_release, y_release, layer)
        self.points_selector.store_selection(mclick, mrelease)

        # finally again with rectangle
        self.points_selector.mask_type = 'rectangle'
        x_click, y_click, x_release, y_release, layer = [
            -1.83, -2.24, -1.00, -1.60, 'Input Ret']
        mclick = self._make_mouse_event(x_click, y_click, layer)
        mrelease = self._make_mouse_event(x_release, y_release, layer)
        self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Input Ret'],
                         (165, 166, 167, 168, 205, 206, 207, 208, 245, 246,
                          247, 248, 285, 286, 287, 288, 325, 326, 327, 328,
                          859, 898, 899, 900, 937, 938, 939, 940, 977, 978,
                          979, 980, 981, 1017, 1018, 1019, 1020, 1021, 1057,
                          1058, 1059, 1060, 1061, 1097, 1098, 1099, 1100, 1101,
                          1138, 1139, 1140, 1178, 1179, 1180, 472, 512, 552,
                          592, 470, 471, 510, 511, 550, 551, 590, 591))

    def test_save_load(self):
        # Saving a mixed collection of selections with source and target,
        # and with rectangular and elliptical masks from multiple layers.
        # Loading the saved selection gives the correct GIDs.

        click_list = [[[-4.21, 3.39, -3.60, 4.36, 'Input Ret'], 'rectangle'],
                      [[-1.95, 2.65, -1.28, 3.39, 'Input Ret'], 'ellipse'],
                      [[-2.76, 3.20, -2.09, 3.57, 'Tp'], 'rectangle'],
                      [[0.37, -3.24, 0.74, -2.87, 'Rs'], 'rectangle'],
                      [[3.49, -4.31, 4.35, -3.40, 'Input Ret'], 'rectangle'],
                      [[-2.19, -2.05, -1.40, -1.50, 'Input Ret'], 'ellipse'],
                      [[3.05, -3.52, 3.60, -3.21, 'Tp'], 'rectangle'],
                      [[2.88, -3.73, 3.43, -2.93, 'Rs'], 'ellipse'],
                      [[-3.72, 2.51, -1.46, 3.61, 'Rs'], 'ellipse']]
        type_list = ['source', 'source', 'source', 'source',
                     'target', 'target', 'target', 'target', 'target']

        for area, area_type in zip(click_list, type_list):
            xc, yc, xr, yr, layer = area[0]
            self.points_selector.mask_type = area[1]
            self.points_selector.connection_type = area_type
            mclick = self._make_mouse_event(xc, yc, layer)
            mrelease = self._make_mouse_event(xr, yr, layer)
            self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()
        self.assertEqual(src_gid_dict['Tp'],
                         (4247, 4248, 4287, 4288, 4327, 4328, 4367, 4368, 5847,
                          5848, 5887, 5888, 5927, 5928, 5967, 5968))
        self.assertEqual(src_gid_dict['Input Ret'],
                         (2, 3, 4, 42, 43, 44, 406, 407, 445, 446, 447, 448,
                          485, 486, 487, 488, 526, 527))
        self.assertEqual(src_gid_dict['Rs'],
                         (39916, 39946))

        self.assertEqual(trgt_gid_dict['Tp'],
                         (5441, 5442, 5481, 5482, 5521, 5522, 7041, 7042, 7081,
                          7082, 7121, 7122))
        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (1519, 1520, 1521, 1559, 1560, 1561, 1599, 1600, 1601,
                          390, 391, 430, 431, 470, 471, 510, 511))
        self.assertEqual(trgt_gid_dict['Rs'],
                         (40216, 40217, 40218, 40246, 40247, 40248, 39443,
                          39472, 39473, 39474, 39502, 39503, 39504, 39531,
                          39532, 39533, 39534, 39535, 39561, 39562, 39563,
                          39564, 39565, 39592, 39593, 39594, 39595, 39622,
                          39623, 39624, 39652, 39653, 39654, 39683))

        m_event = MouseEvent(
            'mouse_event', self.points_selector.fig.canvas, 0, 0, button=1)
        self.points_selector.interface._save_selection_on_clicked(m_event)
        self.points_selector.interface._reset_button_on_clicked(m_event)
        self.points_selector.interface._load_selection_on_clicked(m_event)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Tp'],
                         (4247, 4248, 4287, 4288, 4327, 4328, 4367, 4368, 5847,
                          5848, 5887, 5888, 5927, 5928, 5967, 5968))
        self.assertEqual(src_gid_dict['Input Ret'],
                         (2, 3, 4, 42, 43, 44, 406, 407, 445, 446, 447, 448,
                          485, 486, 487, 488, 526, 527))
        self.assertEqual(src_gid_dict['Rs'],
                         (39916, 39946))

        self.assertEqual(trgt_gid_dict['Tp'],
                         (5441, 5442, 5481, 5482, 5521, 5522, 7041, 7042, 7081,
                          7082, 7121, 7122))
        self.assertEqual(trgt_gid_dict['Input Ret'],
                         (1519, 1520, 1521, 1559, 1560, 1561, 1599, 1600, 1601,
                          390, 391, 430, 431, 470, 471, 510, 511))
        self.assertEqual(trgt_gid_dict['Rs'],
                         (40216, 40217, 40218, 40246, 40247, 40248, 39443,
                          39472, 39473, 39474, 39502, 39503, 39504, 39531,
                          39532, 39533, 39534, 39535, 39561, 39562, 39563,
                          39564, 39565, 39592, 39593, 39594, 39595, 39622,
                          39623, 39624, 39652, 39653, 39654, 39683))

    def test_empty_area(self):
        self.points_selector.mask_type = 'rectangle'
        click_list = [-0.84, 1.16, -0.22, 1.25, 'Tp']
        # click_list = [-2.72, -2.10, -2.54, -1.94, 'Tp']
        # click_list = [-0.88, -0.50, -0.70, -0.32, 'Tp']

        mclick = self._make_mouse_event(click_list[0], click_list[1],
                                        click_list[4])
        mrelease = self._make_mouse_event(click_list[2], click_list[3],
                                          click_list[4])
        self.points_selector.store_selection(mclick, mrelease)

        src_gid_dict, trgt_gid_dict = self._find_gids()

        self.assertEqual(src_gid_dict['Tp'], ())

    def test_switch_projection(self):
        # self.points_selector.cprojection = 'projection 1'
        x_click, y_click, x_release, y_release, layer = [-0.99, 1.28, -0.49,
                                                         1.72, 'Input Ret']
        interface = self.points_selector.interface
        for sel_proj in self.points_selector.cprojection_list:
            self.setUp()
            interface.selector_interaction.change_projection(sel_proj)
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)

            for check_proj in self.points_selector.cprojection_list:
                interface.selector_interaction.change_projection(
                    check_proj)
                src_gid_dict, trgt_gid_dict = self._find_gids()
                if check_proj == sel_proj:
                    self.assertEqual(src_gid_dict, {
                        'Input Ret': (613, 614, 615, 653,
                                      654, 655, 693, 694,
                                      695)})
                else:
                    self.assertEqual(src_gid_dict, {})

    def test_undo_redo(self):
        click_list = [[-2.0553, -0.4571, 0.8160, 2.1532, 'Input Ret'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Tp'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Rp'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Vp_v'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Vs_h'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Vs_v'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'RetParrot'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Vp_h'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Ts'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Rs'],
                      [-2.0553, -0.4571, 0.8160, 2.1532, 'Vs_c']]
        i = 1
        empty_selection_dict = self.points_selector.axs_layer_dict.copy()
        for x_click, y_click, x_release, y_release, layer in click_list:
            mclick = self._make_mouse_event(x_click, y_click, layer)
            mrelease = self._make_mouse_event(x_release, y_release, layer)
            self.points_selector.store_selection(mclick, mrelease)
            if i == 5:
                half_selection_dict = (
                    self.points_selector.axs_layer_dict.copy())
            i += 1
        full_selection_dict = self.points_selector.axs_layer_dict.copy()

        self.assertEqual(self.points_selector.axs_layer_dict,
                         full_selection_dict)
        # undo half the selected areas
        for i in range(5):
            self.points_selector.interface._undo_button_on_clicked(mclick)
        self.assertEqual(self.points_selector.axs_layer_dict,
                         half_selection_dict)
        # undo the rest of the selected areas
        for i in range(5):
            self.points_selector.interface._undo_button_on_clicked(mclick)
        self.assertEqual(self.points_selector.axs_layer_dict,
                         empty_selection_dict)
        # redo half of the selected areas
        for i in range(5):
            self.points_selector.interface._redo_button_on_clicked(mclick)
        self.assertEqual(self.points_selector.axs_layer_dict,
                         half_selection_dict)
        # redo the rest of selected areas
        for i in range(5):
            self.points_selector.interface._redo_button_on_clicked(mclick)
        self.assertEqual(self.points_selector.axs_layer_dict,
                         full_selection_dict)


def suite():
    test_classes_to_run = [TestGUI]
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
