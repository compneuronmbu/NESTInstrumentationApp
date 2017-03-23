#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
NEST Connection App

This is the stand-alone version of the NEST Connection App
with Qt5-based GUI.
"""

import os
import fnmatch
import importlib.util
import argparse
import textwrap
from NESTConnectionApp.selector import PointsSelector

# Argument parser
parser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description=textwrap.dedent('''\
        Run the App with the selected model.'''),
    epilog=textwrap.dedent('''\
        Examples:
          python nest_connection_app.py examples/define_hill_tononi.py
          nest_connection_app.py examples/define_brunel.py'''))
parser.add_argument("MODEL", type=str,
                    help="Model definition file to use.")
parser.add_argument("-l", "--layers", type=int,
                    help="Number of layers to plot (default is all)",
                    metavar="N")
parser.add_argument("-s", "--nodesize", type=int,
                    help="Size of nodes in the plot (default is S=20)",
                    metavar="S")
args = parser.parse_args()

# import module defining model from arbitrary Python file
# based on http://stackoverflow.com/questions/19009932/import-arbitrary-python-source-file-python-3-3
module_spec = importlib.util.spec_from_file_location('model_definition', args.MODEL)
model_definition = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(model_definition)

# obtain layer an connection specifications
layers, models, syn_models = model_definition.make_layers()
connections = model_definition.make_connections()
models += syn_models

num_layers = len(layers) if args.layers is None else min(args.layers, len(layers))
nodesize = 20 if args.nodesize is None else args.nodesize

PointsSelector(layers[:num_layers],
               models=models,
               syn_models=syn_models,
               connections=connections,
               nodesize=nodesize
               ).run()
