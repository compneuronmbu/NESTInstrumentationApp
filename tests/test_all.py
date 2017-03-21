# -*- coding: utf-8 -*-
import unittest
from .test_gui import TestGUI
from .test_with_nest import TestWithNEST
from .test_brunel import TestBrunel
from .test_simulate import TestSimulate
from .test_neuron_type import TestNeuronType


def suite():
    test_classes_to_run = [TestGUI,
                           TestWithNEST,
                           TestBrunel,
                           TestSimulate,
                           TestNeuronType]
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
