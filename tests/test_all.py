# -*- coding: utf-8 -*-
import unittest
from .test_gui import TestGUI
from .test_with_nest import TestWithNEST, TestWithNESTSmallSystem
from .test_brunel import TestBrunel


def suite():
    test_classes_to_run = [TestGUI,
                           TestWithNEST,
                           TestWithNESTSmallSystem,
                           TestBrunel]
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
